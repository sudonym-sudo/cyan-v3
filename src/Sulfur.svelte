<script lang="ts">
    import { onMount } from "svelte";
    import { username as usernameStore } from "./stores";
    import { 
        subscribeToMessages, 
        sendMessage as nostrSendMessage, 
        parseMessageEvent,
        closePool
    } from "./nostr";
    import type { Event } from "nostr-tools";

    const MAX_MESSAGE_LENGTH = 200;
    const MAX_REPLY_MESSAGE_PREVIEW_LENGTH = 100;

    // Message interface matching nostr event format
    interface Message {
        id: string;
        text: string;
        user: string;
        timestamp: string;
        replyTo?: string;
        isOwner?: boolean;
        createdAt: number; // Unix timestamp for sorting
    }

    let messages: Message[] = [];
    let newMessage = "";
    let chatContainer: HTMLDivElement;
    let username = "anonymous-" + Math.floor(Math.random() * 10000);
    let unsubscribe: (() => void) | null = null;
    let isLoading = true;
    let hasLoadedInitial = false;

    let replyToId: string | null = null;
    let replyToUser: string | null = null;
    let expandedMessages = new Map<number, boolean>();

    $: if (typeof $usernameStore === "string" && $usernameStore.trim()) {
        username = $usernameStore;
    }

    function toggleExpanded(index: number) {
        expandedMessages.set(index, !expandedMessages.get(index));
        expandedMessages = expandedMessages;
    }

    function formatTimestamp(iso: string) {
        if (!iso) return "";
        return new Date(iso).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    function stringToColor(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = (hash * 137) % 360;
        return `hsl(${hue}, 60%, 65%)`;
    }

    function processMessage(msg: Message): Message {
        // --- SUDO COMMAND LOGIC ---
        if (msg.text.startsWith("sudo ")) {
            return {
                ...msg,
                text: msg.text.slice(5),
                isOwner: true,
            };
        }
        return { ...msg, isOwner: false };
    }

    function handleNostrEvent(event: Event) {
        const parsed = parseMessageEvent(event);
        
        // Check if message already exists
        if (messages.some(m => m.id === parsed.id)) {
            return;
        }

        const message: Message = {
            id: parsed.id,
            text: parsed.text,
            user: parsed.user,
            timestamp: parsed.timestamp,
            replyTo: parsed.replyTo,
            createdAt: event.created_at
        };

        // Add message and sort by created_at (oldest first, newest at bottom)
        messages = [...messages, message].sort((a, b) => a.createdAt - b.createdAt);
        
        // Scroll to bottom for new messages (only if already near bottom)
        setTimeout(() => {
            if (chatContainer) {
                const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
                if (isNearBottom) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }
        }, 10);
    }

    function getMessageById(id: string): Message | undefined {
        return messages.find((m) => m.id === id);
    }

    async function sendMessage() {
        if (!newMessage.trim()) return;

        const text = newMessage;
        newMessage = "";

        try {
            await nostrSendMessage(text, username, replyToId || undefined);
            replyToId = null;
            replyToUser = null;
        } catch (e) {
            console.error("[sulfur] failed to send message:", e);
            alert("Message failed to send!");
            newMessage = text;
        }
    }

    function startSubscription() {
        if (unsubscribe) {
            unsubscribe();
        }

        isLoading = true;
        hasLoadedInitial = false;
        
        unsubscribe = subscribeToMessages(
            handleNostrEvent,
            () => {
                isLoading = false;
                hasLoadedInitial = true;
                // Scroll to bottom after initial load
                setTimeout(() => {
                    if (chatContainer) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                }, 100);
            }
        );
    }

    onMount(() => {
        startSubscription();

        return () => {
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
            closePool();
        };
    });

    function setReplyTo(id: string | null, user: string | null = null) {
        replyToId = id;
        replyToUser = user;
    }
</script>

<div class="sulfur-container">
    <div class="header">
        <span class="channel-name"># cyanv3-chat</span>
        <div class="user-block">
            <span>user:</span>
            <input
                type="text"
                bind:value={$usernameStore}
                class="username-input"
                placeholder="set username..."
            />
        </div>
    </div>

    <div class="chat-history" bind:this={chatContainer}>
        {#if isLoading && messages.length === 0}
            <div class="message-line system">
                <span class="content">Connecting to Nostr relays...</span>
            </div>
        {/if}

        {#each messages as msg, i (msg.id)}
            {@const processed = processMessage(msg)}
            <div
                id={"message-" + msg.id}
                class="message-line"
                class:owner-line={processed.isOwner}
            >
                <!-- Timestamp -->
                <span class="timestamp"
                    >[{formatTimestamp(processed.timestamp)}]</span
                >

                <!-- User -->
                {#if processed.isOwner}
                    <span class="owner-badge">[OWNER]</span>
                    <span class="sender-name owner">{processed.user}</span>
                {:else}
                    <span
                        class="sender-name"
                        style="color: {stringToColor(processed.user)}"
                        >{processed.user}</span
                    >
                {/if}

                <!-- Separator -->
                <span class="sep">&gt;</span>

                <!-- Content -->
                <span class="content">
                    {#if msg.replyTo}
                        {@const parent = getMessageById(msg.replyTo)}
                        {#if parent}
                            {@const replied = processMessage(parent)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span
                                class="reply-ref"
                                on:click={() => {
                                    const el = document.getElementById("message-" + msg.replyTo);
                                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }}
                                >{replied.text.length >
                                MAX_REPLY_MESSAGE_PREVIEW_LENGTH
                                    ? `${replied.text.slice(0, MAX_REPLY_MESSAGE_PREVIEW_LENGTH)}(...)`
                                    : replied.text}
                            </span>
                        {/if}
                    {/if}
                    {#if processed.text.length > MAX_MESSAGE_LENGTH}
                        {#if expandedMessages.get(i)}
                            {processed.text}
                            <button
                                class="show-more-less"
                                on:click={() => toggleExpanded(i)}
                                >[ SHOW LESS ]</button
                            >
                        {:else}
                            {processed.text.slice(0, MAX_MESSAGE_LENGTH) +
                                "..."}
                            <button
                                class="show-more-less"
                                on:click={() => toggleExpanded(i)}
                                >[ SHOW MORE ]</button
                            >
                        {/if}
                    {:else}
                        {processed.text}
                    {/if}
                </span>

                <!-- Actions -->
                <button class="reply-btn" on:click={() => setReplyTo(msg.id, processed.user)}
                    >reply</button
                >
            </div>
        {:else}
            {#if !isLoading}
                <div class="message-line system">
                    <span class="content"
                        >No messages yet. Start the conversation!</span
                    >
                </div>
            {/if}
        {/each}
    </div>

    {#if replyToId}
        {@const preview = getMessageById(replyToId)}
        {#if preview}
            {@const processed = processMessage(preview)}
            <div class="reply-preview-bar">
                <span
                    >replying to <strong>{processed.user}</strong>: {processed.text.length > 50 ? processed.text.slice(0, 50) + '...' : processed.text}</span
                >
                <button class="cancel-reply" on:click={() => setReplyTo(null)}
                    >✖</button
                >
            </div>
        {/if}
    {/if}

    <div class="input-area">
        <span class="prompt">&gt;</span>
        <input
            type="text"
            bind:value={newMessage}
            placeholder="Send message..."
            on:keydown={(e) => e.key === "Enter" && sendMessage()}
            class="chat-input-field"
        />
        <button
            class="send-btn"
            on:click={sendMessage}
            disabled={!newMessage.trim()}>Send</button
        >
    </div>
</div>

<style>
    .sulfur-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        color: var(--text-primary);
        font-family: var(--font-mono);
        background-color: transparent;
    }

    .header {
        padding: 10px 0;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        margin-bottom: 10px;
    }

    .channel-name {
        color: var(--text-secondary);
        font-weight: bold;
    }

    .user-block {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted);
    }

    .username-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--border-subtle);
        color: var(--accent-cyan);
        width: 120px;
        text-align: right;
        font-family: var(--font-mono);
    }

    .username-input:focus {
        border-bottom-color: var(--accent-cyan);
        outline: none;
    }

    .chat-history {
        flex-grow: 1;
        overflow-y: auto;
        padding-right: 5px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .message-line {
        display: flex;
        align-items: baseline;
        font-size: 13px;
        line-height: 1.5;
        padding: 2px 4px;
        border-radius: 4px;
    }

    .message-line:hover {
        background-color: var(--surface-hover);
    }

    .message-line:hover .reply-btn {
        opacity: 0.5;
    }

    .message-line.system {
        opacity: 0.6;
        font-style: italic;
    }

    .timestamp {
        color: var(--text-muted);
        margin-right: 8px;
        font-size: 11px;
        white-space: nowrap;
    }

    .owner-badge {
        background-color: var(--accent-cyan);
        color: #000;
        font-size: 10px;
        padding: 0 4px;
        border-radius: 2px;
        margin-right: 5px;
        font-weight: bold;
    }

    .sender-name {
        font-weight: bold;
        white-space: nowrap;
    }

    .sender-name.owner {
        color: var(--accent-cyan);
        text-shadow: 0 0 5px var(--accent-cyan-dim);
    }

    .sep {
        margin: 0 8px;
        color: var(--text-muted);
    }

    .content {
        word-break: break-word;
        flex-grow: 1;
    }

    .reply-ref {
        color: var(--text-secondary);
        background-color: var(--surface-hover);
        border-radius: 3px;
        padding: 0 4px;
        margin-right: 4px;
        cursor: pointer;
    }

    .reply-ref:hover {
        background-color: var(--border-color);
    }

    .reply-btn {
        opacity: 0;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 11px;
        margin-left: 10px;
        padding: 0;
    }

    .reply-btn:hover {
        color: var(--text-primary);
        opacity: 1 !important;
    }

    .reply-preview-bar {
        background-color: var(--surface-hover);
        border-left: 2px solid var(--accent-cyan);
        padding: 8px;
        margin: 10px 0;
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-secondary);
    }

    .cancel-reply {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 14px;
    }

    .cancel-reply:hover {
        color: var(--accent-error);
    }

    .input-area {
        display: flex;
        align-items: center;
        border-top: 1px solid var(--border-color);
        padding-top: 10px;
        margin-top: 5px;
    }

    .prompt {
        color: var(--accent-cyan);
        margin-right: 10px;
        font-weight: bold;
    }

    .chat-input-field {
        flex-grow: 1;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-family: var(--font-mono);
        font-size: 14px;
        padding: 5px;
    }

    .chat-input-field:focus {
        outline: none;
    }

    .send-btn {
        background: transparent;
        border: 1px solid var(--border-subtle);
        color: var(--text-secondary);
        padding: 4px 10px;
        border-radius: 4px;
        margin-left: 10px;
        cursor: pointer;
        font-size: 12px;
    }

    .send-btn:hover:not(:disabled) {
        border-color: var(--text-primary);
        color: var(--text-primary);
    }

    .send-btn:disabled {
        opacity: 0.3;
        cursor: default;
    }

    .show-more-less {
        background: transparent;
        border: none;
        color: var(--accent-cyan);
        font-family: var(--font-mono);
        font-size: 11px;
        cursor: pointer;
        padding: 0 4px;
        margin-left: 4px;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .show-more-less:hover {
        opacity: 1;
        text-decoration: underline;
    }

    .owner-line {
        background-color: rgba(80, 227, 194, 0.05);
    }
</style>