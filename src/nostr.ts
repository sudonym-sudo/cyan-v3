import { SimplePool, finalizeEvent, getPublicKey } from 'nostr-tools';
import type { Event } from 'nostr-tools';

// Simple hash function to generate bytes from string
function stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const result = new Uint8Array(32);
    
    // Simple mixing algorithm
    for (let i = 0; i < 32; i++) {
        let val = i;
        for (let j = 0; j < data.length; j++) {
            val = ((val * 31) + data[j] + (j * 137)) & 0xff;
        }
        result[i] = val;
    }
    
    return result;
}

// Convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Cyanv3 specific channel - deterministic ID
const CHANNEL_NAME = 'cyanv3-public-chat1';
const CHANNEL_ID = bytesToHex(stringToBytes(CHANNEL_NAME));

// Relay pool - reliable relays (removed restrictive ones)
const RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol',
    'wss://nostr.mom',
    'wss://relay.primal.net',
    'wss://nostr.bitcoiner.social'
];

// Global pool instance
let pool: SimplePool | null = null;
let currentSub: any = null;
let receivedEventIds = new Set<string>();

// Generate deterministic private key from username
function getKeypairFromUsername(username: string): { sk: Uint8Array; pk: string } {
    const sk = stringToBytes(username);
    const pk = getPublicKey(sk);
    return { sk, pk };
}

// Initialize pool
export function initPool(): SimplePool {
    if (!pool) {
        pool = new SimplePool();
    }
    return pool;
}

// Close pool
export function closePool() {
    if (currentSub) {
        currentSub.close();
        currentSub = null;
    }
    if (pool) {
        pool.close(RELAYS);
        pool = null;
    }
    receivedEventIds.clear();
}

// Get channel ID
export function getChannelId(): string {
    return CHANNEL_ID;
}

// Get relays
export function getRelays(): string[] {
    return [...RELAYS];
}

// Subscribe to messages
export function subscribeToMessages(
    onMessage: (event: Event) => void,
    onEose?: () => void
): () => void {
    const p = initPool();
    
    if (currentSub) {
        currentSub.close();
        currentSub = null;
    }
    
    const filter = {
        kinds: [42],
        '#e': [CHANNEL_ID],
        limit: 100
    };
    
    console.log('[nostr] subscribing to channel:', CHANNEL_ID);
    
    // Subscribe for realtime updates
    // subscribeMany expects: relays, filters (spread), callbacks
    currentSub = p.subscribeMany(
        RELAYS,
        filter, // Pass filter object directly, not wrapped in array
        {
            onevent: (event: Event) => {
                // Prevent duplicates
                if (receivedEventIds.has(event.id)) {
                    return;
                }
                receivedEventIds.add(event.id);
                console.log('[nostr] received event:', event.id?.slice(0, 8));
                onMessage(event);
            },
            oneose: () => {
                console.log('[nostr] subscription eose');
            }
        }
    );
    
    // Fetch existing messages immediately
    p.querySync(RELAYS, filter).then(events => {
        console.log('[nostr] fetched', events.length, 'existing messages');
        // Sort by created_at ascending (oldest first)
        events.sort((a, b) => a.created_at - b.created_at);
        events.forEach(event => {
            if (!receivedEventIds.has(event.id)) {
                receivedEventIds.add(event.id);
                onMessage(event);
            }
        });
        onEose?.();
    }).catch(err => {
        console.error('[nostr] querySync failed:', err);
        onEose?.();
    });
    
    return () => {
        currentSub?.close();
        currentSub = null;
    };
}

// Send a message
export async function sendMessage(
    text: string,
    username: string,
    replyToId?: string
): Promise<void> {
    const p = initPool();
    const { sk } = getKeypairFromUsername(username);
    
    // Build tags - root reference to channel
    const tags: string[][] = [
        ['e', CHANNEL_ID, '', 'root']
    ];
    
    if (replyToId) {
        tags.push(['e', replyToId, '', 'reply']);
    }
    
    // Create event template
    const eventTemplate = {
        kind: 42,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: JSON.stringify({
            text: text,
            user: username
        })
    };
    
    // Sign event
    const event = finalizeEvent(eventTemplate, sk);
    console.log('[nostr] sending event:', event.id?.slice(0, 8));
    
    // Publish to relays
    const promises = RELAYS.map(async (relay) => {
        try {
            await p.publish([relay], event);
            console.log('[nostr] published to', relay);
            return { relay, success: true };
        } catch (err) {
            console.error(`[nostr] failed to publish to ${relay}:`, err);
            return { relay, success: false };
        }
    });
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    
    if (successful.length === 0) {
        throw new Error('Failed to publish to any relay');
    }
    
    console.log(`[nostr] published to ${successful.length}/${RELAYS.length} relays`);
}

// Parse event content
export function parseMessageEvent(event: Event): {
    id: string;
    text: string;
    user: string;
    timestamp: string;
    replyTo?: string;
} {
    let content: { text: string; user: string };
    
    try {
        content = JSON.parse(event.content);
    } catch {
        content = { text: event.content, user: 'unknown' };
    }
    
    // Find reply reference
    const replyTag = event.tags.find(tag => tag[0] === 'e' && tag[3] === 'reply');
    const replyTo = replyTag ? replyTag[1] : undefined;
    
    return {
        id: event.id,
        text: content.text || event.content,
        user: content.user || 'anonymous',
        timestamp: new Date(event.created_at * 1000).toISOString(),
        replyTo
    };
}
