<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { shouldShowNotification } from "./notification";
    import { sendFeedback } from "./feedback";

    export let collapsed = false;

    const dispatch = createEventDispatcher();

    let time = "";
    let timeParts = { h: "", m: "", x: "" };
    let date = "";
    let interval: any;
    let showSulfurBadge = false;
    let showFeedbackModal = false;
    let feedbackType: "bug" | "request" = "bug";
    let feedbackText = "";
    let feedbackUsername = "anonymous";
    let feedbackSubmitting = false;
    let feedbackMessage = "";

    onMount(() => {
        showSulfurBadge = false;
        // Load saved username from localStorage if available
        try {
            const stored = localStorage.getItem("cyanv3_username");
            if (stored) feedbackUsername = stored;
        } catch {}
    });

    const apps = [
        { id: "games", label: "Cyanide", icon: "sports_esports" },
        { id: "proxy", label: "Chromium", icon: "public" },
        { id: "sulfur", label: "Sulfur", icon: "chat_bubble" },
        { id: "floride", label: "Flouride", icon: "terminal" },
    ];

    function openFeedback(type: "bug" | "request") {
        feedbackType = type;
        feedbackText = "";
        feedbackMessage = "";
        showFeedbackModal = true;
    }

    function closeFeedback() {
        showFeedbackModal = false;
        feedbackText = "";
        feedbackMessage = "";
    }

    async function submitFeedback() {
        if (!feedbackText.trim()) return;

        feedbackSubmitting = true;
        feedbackMessage = "";

        try {
            await sendFeedback(feedbackType, feedbackText, feedbackUsername);
            feedbackMessage =
                feedbackType === "bug"
                    ? "Bug reported! Thanks!"
                    : "Game request submitted!";
            feedbackText = "";
            setTimeout(() => {
                closeFeedback();
            }, 1500);
        } catch (err) {
            feedbackMessage = "Failed to send. Try again.";
        } finally {
            feedbackSubmitting = false;
        }
    }

    function updateTime() {
        const now = new Date();
        time = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        const parts = time.split(/[:\s]+/);
        if (parts.length >= 2) {
            timeParts = {
                h: parts[0],
                m: parts[1],
                x: parts[2] || "",
            };
        }

        date = now.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    onMount(() => {
        updateTime();
        interval = setInterval(updateTime, 10000);
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });
</script>

<aside class="sidebar-container">
    <div class="sidebar" class:collapsed>
        <!-- Header -->
        <div class="sidebar-header">
            <div class="logo-area">
                <div class="site-info">
                    <span class="site-name">CYλN</span>
                    <span class="version">v3.3.2</span>
                </div>
            </div>

            <button
                class="toggle-btn"
                on:click={() => dispatch("toggle")}
                title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <span class="material-symbols-outlined">
                    {collapsed ? "left_panel_open" : "left_panel_close"}
                </span>
            </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
            {#each apps as app}
                <button
                    class="nav-item"
                    on:click={() => dispatch("launch", { appId: app.id })}
                    title={app.label}
                >
                    <div class="nav-icon-box">
                        <span class="material-symbols-outlined icon"
                            >{app.icon}</span
                        >
                        {#if app.id === "sulfur" && showSulfurBadge}
                            <span class="app-badge" title="nostr fixed!"></span>
                        {/if}
                    </div>
                    <span class="label">{app.label}</span>
                </button>
            {/each}
        </nav>

        <!-- Feedback Buttons -->
        <div class="feedback-section">
            {#if collapsed}
                <div class="feedback-icons">
                    <button
                        class="feedback-icon-btn"
                        on:click={() => openFeedback("bug")}
                        title="Report Bug"
                    >
                        <span class="material-symbols-outlined">bug_report</span
                        >
                    </button>
                    <button
                        class="feedback-icon-btn"
                        on:click={() => openFeedback("request")}
                        title="Request Game"
                    >
                        <span class="material-symbols-outlined">games</span>
                    </button>
                </div>
            {:else}
                <div class="feedback-buttons">
                    <button
                        class="feedback-btn"
                        on:click={() => openFeedback("bug")}
                    >
                        <span class="material-symbols-outlined">bug_report</span
                        >
                        <span class="feedback-label">Report Bug</span>
                    </button>
                    <button
                        class="feedback-btn"
                        on:click={() => openFeedback("request")}
                    >
                        <span class="material-symbols-outlined">games</span>
                        <span class="feedback-label">Request Game</span>
                    </button>
                </div>
            {/if}
        </div>

        <!-- Footer: Date & Time -->
        <div class="sidebar-footer">
            {#if collapsed}
                <div class="time-widget-vertical">
                    <span class="v-part">{timeParts.h}</span>
                    <span class="v-sep">/</span>
                    <span class="v-part">{timeParts.m}</span>
                    {#if timeParts.x}
                        <span class="v-ampm">{timeParts.x}</span>
                    {/if}
                </div>
            {:else}
                <div class="time-widget">
                    <span class="time">{time}</span>
                    <span class="date">{date}</span>
                </div>
            {/if}
        </div>
    </div>
</aside>

{#if showFeedbackModal}
    <div class="feedback-modal-overlay" on:click={closeFeedback}>
        <div class="feedback-modal" on:click|stopPropagation>
            <div class="feedback-modal-header">
                <h3>
                    {feedbackType === "bug" ? "Report a Bug" : "Request a Game"}
                </h3>
                <button class="feedback-close" on:click={closeFeedback}
                    >×</button
                >
            </div>
            <div class="feedback-modal-body">
                <input
                    type="text"
                    class="feedback-input"
                    placeholder="Your username..."
                    bind:value={feedbackUsername}
                />
                <textarea
                    class="feedback-textarea"
                    placeholder={feedbackType === "bug"
                        ? "Describe the bug..."
                        : "What game would you like to see?"}
                    bind:value={feedbackText}
                    rows="4"
                ></textarea>
                {#if feedbackMessage}
                    <div
                        class="feedback-message"
                        class:error={feedbackMessage.includes("Failed")}
                    >
                        {feedbackMessage}
                    </div>
                {/if}
                <button
                    class="feedback-submit"
                    on:click={submitFeedback}
                    disabled={!feedbackText.trim() || feedbackSubmitting}
                >
                    {feedbackSubmitting ? "Sending..." : "Submit"}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Floating Container Wrapper */
    .sidebar-container {
        height: 100vh;
        display: flex;
        align-items: center;
        padding-left: 10px; /* Slight offset from screen edge */
        flex-shrink: 0;
        width: auto;
    }

    .sidebar {
        width: 240px;
        height: calc(100vh - 20px); /* Floating gap */
        background-color: rgba(40, 40, 40, 0.75); /* Slight Grey Translucent */
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        padding: 20px 15px;
        transition:
            width 0.3s cubic-bezier(0.25, 1, 0.5, 1),
            padding 0.3s;
        overflow: hidden;
        backdrop-filter: blur(24px) saturate(180%); /* Glassmorphism */
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        font-family: var(--font-mono);
        color: #eee;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    .sidebar::-webkit-scrollbar {
        display: none;
    }

    .sidebar.collapsed {
        width: 54px; /* Tighter width */
        padding: 20px 8px; /* Less padding */
    }

    /* Header */
    .sidebar-header {
        margin-bottom: 30px;
        padding-left: 5px;
        min-height: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .logo-area {
        display: flex;
        align-items: center;
        gap: 0;
        flex-grow: 1;
        overflow: hidden;
    }

    .site-info {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
        transition: opacity 0.2s;
        white-space: nowrap;
    }

    .site-name {
        font-weight: 700;
        font-size: 16px;
        letter-spacing: 0.05em;
    }

    .version {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
    }

    .sidebar.collapsed .site-info {
        display: none;
    }

    .sidebar.collapsed .logo-area {
        display: none;
    }

    /* Toggle Button */
    .toggle-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            color 0.2s,
            background 0.2s;
    }

    .toggle-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
    }

    .sidebar.collapsed .sidebar-header {
        justify-content: center; /* Center the button */
        padding-left: 0;
    }

    /* Navigation */
    .sidebar-nav {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .nav-item {
        display: flex;
        align-items: center;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        padding: 10px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
    }

    .nav-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: #fff;
        transform: scale(1.02);
    }

    .nav-item:active {
        transform: scale(0.98);
    }

    .nav-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        width: 24px;
        flex-shrink: 0;
        position: relative;
    }

    .app-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 8px;
        height: 8px;
        background-color: var(--accent-cyan);
        border-radius: 50%;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.7;
            transform: scale(1.1);
        }
    }

    .sidebar.collapsed .app-badge {
        top: -2px;
        right: -2px;
    }

    .nav-item .icon {
        font-size: 20px;
    }

    .sidebar.collapsed .nav-item {
        justify-content: center;
        padding: 12px 0;
    }

    .sidebar.collapsed .nav-icon-box {
        margin-right: 0;
    }

    .sidebar.collapsed .label {
        display: none;
    }

    /* Footer */
    .sidebar-footer {
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .time-widget {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding-left: 5px;
        white-space: nowrap;
    }

    .time {
        font-size: 20px;
        font-weight: 300;
        color: #fff;
    }

    .date {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Vertical Time Widget (Collapsed) */
    .time-widget-vertical {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        line-height: 1.2;
        color: rgba(255, 255, 255, 0.8);
        gap: 2px;
    }

    .v-part {
        font-weight: 500;
        font-size: 12px;
    }

    .v-sep {
        opacity: 0.5;
        font-size: 10px;
        transform: rotate(15deg);
    }

    .v-ampm {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 2px;
    }

    /* Feedback Section */
    .feedback-section {
        margin-top: auto;
        padding: 10px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 10px;
    }

    .feedback-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .feedback-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.7);
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
        transition: all 0.2s;
        text-align: left;
    }

    .feedback-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.4);
        color: #fff;
    }

    .feedback-btn .material-symbols-outlined {
        font-size: 18px;
    }

    .feedback-icons {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .feedback-icon-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.7);
        padding: 6px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .feedback-icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.4);
        color: #fff;
    }

    .feedback-icon-btn .material-symbols-outlined {
        font-size: 18px;
    }

    /* Feedback Modal */
    .feedback-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .feedback-modal {
        background: var(--surface-color, #111);
        border: 1px solid var(--border-color, #333);
        border-radius: var(--border-radius, 6px);
        width: 90%;
        max-width: 400px;
        color: var(--text-primary, #ededed);
        font-family: var(--font-mono, monospace);
    }

    .feedback-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid var(--border-color, #333);
    }

    .feedback-modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
    }

    .feedback-close {
        background: transparent;
        border: none;
        color: var(--text-muted, #555);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }

    .feedback-close:hover {
        color: var(--text-primary, #ededed);
        background: rgba(255, 255, 255, 0.1);
    }

    .feedback-modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .feedback-input,
    .feedback-textarea {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid var(--border-color, #333);
        border-radius: 4px;
        padding: 10px;
        color: var(--text-primary, #ededed);
        font-family: var(--font-mono, monospace);
        font-size: 13px;
        width: 100%;
        box-sizing: border-box;
    }

    .feedback-input:focus,
    .feedback-textarea:focus {
        outline: none;
        border-color: var(--accent-cyan, #50e3c2);
    }

    .feedback-textarea {
        resize: vertical;
        min-height: 80px;
    }

    .feedback-submit {
        background: var(--accent-cyan, #50e3c2);
        color: #000;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-family: var(--font-mono, monospace);
        font-size: 13px;
        font-weight: 500;
        transition: opacity 0.2s;
    }

    .feedback-submit:hover:not(:disabled) {
        opacity: 0.9;
    }

    .feedback-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .feedback-message {
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
    }

    .feedback-message:not(.error) {
        background: rgba(80, 227, 194, 0.1);
        color: var(--accent-cyan, #50e3c2);
    }

    .feedback-message.error {
        background: rgba(255, 0, 51, 0.1);
        color: var(--accent-error, #ff0033);
    }
</style>
