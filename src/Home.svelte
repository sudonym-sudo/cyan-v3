<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import {
        shouldShowNotification,
        dismissNotification,
    } from "./notification";

    const dispatch = createEventDispatcher();

    let showSulfurNotification = false;

    onMount(() => {
        showSulfurNotification = shouldShowNotification();
    });

    function handleDismissNotification() {
        dismissNotification();
        showSulfurNotification = false;
    }

    // Apps Data
    // Apps Data
    const apps = [
        {
            id: "games",
            label: "Games",
            icon: "sports_esports",
        },
        {
            id: "proxy",
            label: "Chromium",
            icon: "public",
        },
        {
            id: "sulfur",
            label: "Sulfur",
            icon: "chat_bubble",
        },
        {
            id: "floride",
            label: "Flouride",
            icon: "terminal",
        },
    ];

    let recentGames: any[] = [];

    function loadRecents() {
        try {
            const stored = localStorage.getItem("recentGames");
            if (stored) {
                recentGames = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load recent games", e);
        }
    }

    // Listen for storage events (e.g. from other tabs) and custom events if possible?
    // Storage event fires on OTHER windows, not the one that changed it.
    // Since we are in the same window (SPAish), we might need a custom event or check on focus.

    function handleStorage(e: StorageEvent) {
        if (e.key === "recentGames") {
            loadRecents();
        }
    }

    onMount(() => {
        loadRecents();
        window.addEventListener("storage", handleStorage);
        // Also listen for focus, as coming back to tab might need update?
        window.addEventListener("focus", loadRecents);
    });

    onDestroy(() => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("focus", loadRecents);
    });

    function launchApp(appId: string) {
        dispatch("launch", { appId });
    }

    function launchRecent(game: any) {
        dispatch("launch", { appId: "games", gameTitle: game.title });
    }

    function formatDate(iso: string) {
        if (!iso) return "";
        return new Date(iso).toLocaleDateString();
    }
</script>

<div class="home-container">
    <div class="content-width">
        {#if showSulfurNotification}
            <div class="notification-banner">
                <div class="notification-content">
                    <span class="notification-icon">✓</span>
                    <span class="notification-text">
                        <strong>! Sulfur is now fixed !</strong>
                    </span>
                </div>
                <button
                    class="notification-dismiss"
                    on:click={handleDismissNotification}
                    title="dismiss"
                >
                    ×
                </button>
            </div>
        {/if}

        <section class="apps-grid">
            {#each apps as app}
                <button
                    class="app-card"
                    on:click={() => launchApp(app.id)}
                    tabindex="0"
                >
                    <div class="icon-box">
                        <span class="material-symbols-outlined">{app.icon}</span
                        >
                    </div>
                    <div class="app-info">
                        <h3>{app.label}</h3>
                    </div>
                </button>
            {/each}
        </section>

        {#if recentGames.length > 0}
            <section class="recents-section">
                <h2>Recently Played</h2>
                <div class="recents-list">
                    {#each recentGames as game}
                        <button
                            class="recent-row"
                            on:click={() => launchRecent(game)}
                            tabindex="0"
                        >
                            <div class="status-dot"></div>
                            <span class="game-title">{game.title}</span>
                            <span class="last-played"
                                >Last played: {formatDate(game.timestamp)}</span
                            >
                            <span class="arrow">→</span>
                        </button>
                    {/each}
                </div>
            </section>
        {/if}
    </div>
</div>

<style>
    .home-container {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        overflow-y: auto;
        padding-top: 60px;
        color: var(--text-primary);
    }

    .content-width {
        width: 100%;
        max-width: 800px;
        padding: 0 20px 40px 20px;
        display: flex;
        flex-direction: column;
        gap: 40px;
    }

    /* Apps Grid */
    .apps-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
    }

    .app-card {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 20px;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: 15px;
        color: var(--text-primary);
        font-family: var(--font-mono);
    }

    .app-card:hover {
        border-color: var(--text-secondary);
        transform: translateY(-2px);
        background: var(--surface-hover);
    }

    .icon-box {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        color: var(--accent-cyan);
    }

    .app-info h3 {
        margin: 0 0 5px 0;
        font-size: 1.1em;
        font-weight: 500;
    }

    /* Recents */
    .recents-section h2 {
        font-size: 1.2em;
        font-weight: 500;
        margin-bottom: 15px;
        color: var(--text-secondary);
        text-transform: uppercase;
        font-size: 0.9em;
        letter-spacing: 0.05em;
    }

    .recents-list {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        overflow: hidden;
    }

    .recent-row {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        border: none;
        border-bottom: 1px solid var(--border-subtle);
        cursor: pointer;
        transition: background 0.2s;
        background: rgba(0, 0, 0, 0.4);
        color: var(--text-primary);
        font-family: var(--font-mono);
        font-size: 13px;
        width: 100%;
        text-align: left;
    }

    .recent-row:last-child {
        border-bottom: none;
    }

    .recent-row:hover {
        background: var(--surface-hover);
    }

    .status-dot {
        width: 8px;
        height: 8px;
        background-color: var(--accent-cyan);
        border-radius: 50%;
        margin-right: 15px;
        opacity: 0.7;
    }

    .game-title {
        font-weight: 500;
        flex-grow: 1;
    }

    .last-played {
        font-size: 0.85em;
        color: var(--text-secondary);
        margin-right: 15px;
    }

    .arrow {
        color: var(--text-muted);
    }

    /* Notification Banner */
    .notification-banner {
        background: var(--accent-cyan-dim);
        border: 1px solid var(--accent-cyan);
        border-radius: var(--border-radius);
        padding: 12px 16px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-grow: 1;
    }

    .notification-icon {
        background: var(--accent-cyan);
        color: #000;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
    }

    .notification-text {
        font-size: 13px;
        color: var(--text-primary);
    }

    .notification-text strong {
        color: var(--accent-cyan);
    }

    .notification-dismiss {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .notification-dismiss:hover {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.1);
    }
</style>
