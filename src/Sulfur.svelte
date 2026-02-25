<script lang="ts">
    import { onMount } from "svelte";
    import { getMessages, sendMessage as apiSendMessage } from "./chatApi";
    import { username as usernameStore } from "./stores";

    const MAX_MESSAGE_LENGTH = 200;
    const MAX_REPLY_MESSAGE_PREVIEW_LENGTH = 100;

    let messages: {
        text: string;
        user: string;
        timestamp: string;
        replyTo?: string;
        isOwner?: boolean;
        id?: string;
    }[] = [];

    let newMessage = "";
    let chatContainer: HTMLDivElement;
    let username = "anonymous-" + Math.floor(Math.random() * 10000);
    let unsubscribe: () => void = () => {};
    let batchSize = 50;

    let replyToIndex: number | null = null;
    let isLoadingMore = false;
    let previousHeight = 0;
    let expandedMessages = new Map<number, boolean>();

    $: if (typeof $usernameStore === "string" && $usernameStore.trim()) {
        username = $usernameStore;
    }

    function toggleExpanded(index: number) {
        expandedMessages.set(index, !expandedMessages.get(index));
        expandedMessages = expandedMessages;
    }

    function loadMoreMessages() {
        if (chatContainer) previousHeight = chatContainer.scrollHeight;
        isLoadingMore = true;
        batchSize += 50;
        subscribeToMessages();
    }

    function formatTimestamp(iso: string) {
        if (!iso) return "";
        return new Date(iso).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false, // 24h format for terminal feel
        });
    }

    function stringToColor(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = (hash * 137) % 360;
        return `hsl(${hue}, 60%, 65%)`; // Slightly desaturated for TUI
    }

    function processMessage(msg: {
        text: string;
        user: string;
        timestamp: string;
        replyTo?: string;
        isOwner?: boolean;
        id?: string;
    }) {
        // --- SUDO COMMAND LOGIC ---
        // Verify if the message text starts with "sudo " (case-sensitive or insensitive? Let's do sensitive for strictness)
        if (msg.text.startsWith("sudo ")) {
            return {
                ...msg,
                text: msg.text.slice(5), // Remove "sudo "
                isOwner: true,
            };
        }
        return { ...msg, isOwner: false };
    }

    function scrollToMessage(idx: number) {
        const el = document.getElementById(`message-${idx}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function getMessageIndexById(id: string): number {
        return messages.findIndex((m) => m.id === id);
    }

    function getMessageById(id: string) {
        return messages.find((m) => m.id === id);
    }

    async function sendMessage() {
        if (!newMessage.trim()) return;
        const payload = {
            text: newMessage,
            user: username,
            replyTo: replyToIndex,
        };
        const keep = newMessage;
        newMessage = "";

        try {
            const replyId =
                payload.replyTo !== null && messages[payload.replyTo]
                    ? messages[payload.replyTo].id
                    : undefined;
            await apiSendMessage(payload.text, payload.user, replyId);
        } catch (e) {
            alert("Message failed to send!");
            newMessage = keep;
            return;
        }

        replyToIndex = null;
    }

    function subscribeToMessages() {
        if (unsubscribe) unsubscribe();
        unsubscribe = getMessages((newMsgs) => {
            messages = newMsgs;
            setTimeout(() => {
                if (!chatContainer) return;
                if (isLoadingMore) {
                    const newHeight = chatContainer.scrollHeight;
                    chatContainer.scrollTop = newHeight - previousHeight;
                    isLoadingMore = false;
                } else {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 50);
        }, batchSize);
    }

    onMount(() => {
        const handleVis = () => {
            if (!document.hidden) {
                subscribeToMessages();
            } else if (unsubscribe) {
                unsubscribe();
            }
        };
        document.addEventListener("visibilitychange", handleVis);
        handleVis();

        return () => {
            if (unsubscribe) unsubscribe();
            document.removeEventListener("visibilitychange", handleVis);
        };
    });
</script>

<div class="sulfur-container">
    <div class="header">
        <span class="channel-name"># public-chat</span>
        <div class="user-block">
            <span>user:</span>
            <input
                type="text"
                bind:value={$usernameStore}
                class="username-input"
            />
        </div>
    </div>

    <div class="chat-history" bind:this={chatContainer}>
        <div
            class="load-more"
            on:click={loadMoreMessages}
            on:keypress={(e) => e.key === "Enter" && loadMoreMessages()}
            role="button"
            tabindex="0"
        >
            -- load more --
        </div>

        {#each messages as msg, i (i)}
            {@const processed = processMessage(msg)}
            <div
                id={"message-" + i}
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
                                on:click={() =>
                                    scrollToMessage(
                                        getMessageIndexById(msg.replyTo),
                                    )}
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
                <button class="reply-btn" on:click={() => (replyToIndex = i)}
                    >reply</button
                >
            </div>
        {:else}
            <div class="message-line system">
                <span class="content"
                    >No messages yet. Start the conversation!</span
                >
            </div>
        {/each}
    </div>

    {#if replyToIndex !== null && messages[replyToIndex]}
        {@const preview = processMessage(messages[replyToIndex])}
        <div class="reply-preview-bar">
            <span
                >replying to <strong>{preview.user}</strong>: {preview.text}</span
            >
            <button class="cancel-reply" on:click={() => (replyToIndex = null)}
                >✖</button
            >
        </div>
    {/if}

    <div class="input-area">
        <span class="prompt">&gt;</span>
        <input
            type="text"
            bind:value={newMessage}
            placeholder="SendMessage..."
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
        width: 100px;
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

    .load-more {
        text-align: center;
        cursor: pointer;
        color: var(--text-muted);
        font-size: 11px;
        padding: 5px;
        opacity: 0.8;
    }
    .load-more:hover {
        opacity: 1;
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
        .show-more-less {
            background: none;
            border: none;
            color: var(--accent-cyan);
            cursor: pointer;
            font-size: 11px;
            margin-left: 10px;
            padding: 0;
            text-decoration: underline;
        }
        .show-more-less:hover {
            color: var(--accent-cyan-dim);
        }
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
</style>
