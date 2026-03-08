import { SimplePool, finalizeEvent, getPublicKey } from 'nostr-tools';
import type { Event } from 'nostr-tools';

// Simple hash function to generate bytes from string
function stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const result = new Uint8Array(32);
    
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

// Feedback channel - separate from main chat
const CHANNEL_NAME = 'cyanv3-feedback';
const CHANNEL_ID = bytesToHex(stringToBytes(CHANNEL_NAME));

// Relay pool
const RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol',
    'wss://nostr.mom',
    'wss://relay.primal.net',
    'wss://nostr.bitcoiner.social'
];

let pool: SimplePool | null = null;

function getKeypairFromString(str: string): { sk: Uint8Array; pk: string } {
    const sk = stringToBytes(str);
    const pk = getPublicKey(sk);
    return { sk, pk };
}

function initPool(): SimplePool {
    if (!pool) {
        pool = new SimplePool();
    }
    return pool;
}

export function getChannelId(): string {
    return CHANNEL_ID;
}

export async function sendFeedback(
    type: 'bug' | 'request',
    content: string,
    username: string
): Promise<void> {
    const p = initPool();
    const { sk } = getKeypairFromString(username + '-feedback');
    
    const tags: string[][] = [['e', CHANNEL_ID, '', 'root']];
    
    const eventTemplate = {
        kind: 42,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: JSON.stringify({
            type: type,
            text: content,
            user: username,
            userAgent: navigator.userAgent
        })
    };
    
    const event = finalizeEvent(eventTemplate, sk);
    
    const promises = RELAYS.map(async (relay) => {
        try {
            await p.publish([relay], event);
            return { relay, success: true };
        } catch (err) {
            console.error(`[feedback] failed to publish to ${relay}:`, err);
            return { relay, success: false };
        }
    });
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    
    if (successful.length === 0) {
        throw new Error('Failed to publish to any relay');
    }
    
    console.log(`[feedback] published ${type} to ${successful.length}/${RELAYS.length} relays`);
}

export function parseFeedbackEvent(event: Event): {
    id: string;
    type: 'bug' | 'request';
    text: string;
    user: string;
    userAgent?: string;
    timestamp: string;
} {
    let content: { type: 'bug' | 'request'; text: string; user: string; userAgent?: string };
    
    try {
        content = JSON.parse(event.content);
    } catch {
        content = { type: 'bug', text: event.content, user: 'unknown' };
    }
    
    return {
        id: event.id,
        type: content.type || 'bug',
        text: content.text || event.content,
        user: content.user || 'anonymous',
        userAgent: content.userAgent,
        timestamp: new Date(event.created_at * 1000).toISOString()
    };
}
