<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { flip } from "svelte/animate";
    import { quintOut } from "svelte/easing";
    import { fly } from "svelte/transition";
    import GameCard from "./GameCard.svelte";
    import GameListItem from "./GameListItem.svelte";
    import GameDetail from "./GameDetail.svelte";

    const dispatch = createEventDispatcher();

    export let windowId: number;
    export let gameTitleContext: string | undefined = undefined;

    type Game = {
        title: string;
        imageSrc: string;
        genre: string;
        type: string;
        link: string;
        description: string;
        status: [string, string];
        favorited?: boolean;
        dateAdded?: string;
        fixedDate?: string;
        isNew?: boolean;
        isFixed?: boolean;
        core?: string;
    };

    let games: Game[] = [];
    let loading = true;
    let error: string | null = null;
    let currentView: "grid" | "list" = "grid";
    let isGamePlaying = false;

    $: sortedGames = [...games].sort((a, b) => {
        if (a.favorited && !b.favorited) return -1;
        if (!a.favorited && b.favorited) return 1;
        if (a.isFixed && !b.isFixed) return -1;
        if (!a.isFixed && b.isFixed) return 1;
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return a.title.localeCompare(b.title);
    });

    function handleBackEvent() {
        isGamePlaying = false;
        selectedGame = null;
        dispatch("gamestatechange", {
            title: "Games",
            showBackButton: false,
        });
    }

    function isRecent(dateString: string): boolean {
        const date = new Date(dateString);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date > sevenDaysAgo;
    }

    function isRecentlyFixed(dateString: string): boolean {
        // Parse the fixedDate as a local midnight date (YYYY‑MM‑DD)
        const [y, m, d] = dateString.split("-").map(Number);
        const fixedDate = new Date(y, m - 1, d); // local midnight

        // Get today's date at local midnight
        const now = new Date();
        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        );

        // The "fixed" tag should be visible for 5 days **starting** on the fixedDate.
        const endDate = new Date(fixedDate);
        endDate.setDate(fixedDate.getDate() + 5);

        // Show the tag only if today is on or after the fixed date
        // and before the end of the 5‑day window.
        return today >= fixedDate && today <= endDate;
    }

    onMount(async () => {
        window.addEventListener(`back-${windowId}`, handleBackEvent);

        try {
            const response = await fetch(
                "https://raw.githubusercontent.com/sudonym-sudo/cyan-v3/main/games.json",
            );
            if (!response.ok) {
                throw new Error("Failed to fetch games list");
            }
            const data = await response.json();
            games = data.games.map(
                (game: Omit<Game, "favorited" | "isNew" | "isFixed">) => ({
                    ...game,
                    favorited: false,
                    isNew: game.dateAdded ? isRecent(game.dateAdded) : false,
                    isFixed: game.fixedDate
                        ? isRecentlyFixed(game.fixedDate)
                        : false,
                }),
            );
        } catch (e) {
            if (e instanceof Error) {
                error = e.message;
            } else {
                error = "An unknown error occurred";
            }
        } finally {
            loading = false;
            if (gameTitleContext) {
                const match = games.find(
                    (g) =>
                        g.title.toLowerCase() ===
                        gameTitleContext.toLowerCase(),
                );
                if (match) {
                    selectedGame = match;
                }
            }
        }
    });

    onDestroy(() => {
        window.removeEventListener(`back-${windowId}`, handleBackEvent);
    });

    function toggleFavorite(clickedGame: Game) {
        games = games.map((game) =>
            game.title === clickedGame.title
                ? { ...game, favorited: !game.favorited }
                : game,
        );
    }

    let searchTerm = "";
    let debouncedSearchTerm = "";
    let searchTimeout: any;

    $: {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            debouncedSearchTerm = searchTerm;
            displayLimit = 40; // Reset limit on search
        }, 300);
    }

    let selectedGame: any = null;

    let filteredGames: Game[] = [];
    $: filteredGames = sortedGames.filter((game) =>
        game.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    );

    let displayLimit = 40;
    $: visibleGames = filteredGames.slice(0, displayLimit);

    function handleScroll(e: Event) {
        const target = e.target as HTMLElement;
        if (
            target.scrollHeight - target.scrollTop <=
            target.clientHeight + 100
        ) {
            if (displayLimit < filteredGames.length) {
                displayLimit += 20;
            }
        }
    }

    function handlePlay() {
        isGamePlaying = true;
        dispatch("gamestatechange", {
            title: `[ ${selectedGame.title} ] cyanide`,
            showBackButton: true,
        });
    }
</script>

<div
    class="cyanide-container"
    class:list-view-details-open={currentView === "list" && selectedGame}
>
    <div class="main-view">
        {#if !isGamePlaying}
            <div class="top-bar">
                <div class="search-bar">
                    <input
                        type="text"
                        placeholder="Search..."
                        bind:value={searchTerm}
                    />
                </div>
                <div class="view-switcher">
                    <button
                        on:click={() => (currentView = "grid")}
                        class:active={currentView === "grid"}>Grid</button
                    >
                    <button
                        on:click={() => (currentView = "list")}
                        class:active={currentView === "list"}>List</button
                    >
                </div>
            </div>
        {/if}

        {#if loading}
            <p>Loading games...</p>
        {:else if error}
            <p class="error">Error: {error}</p>
        {:else if currentView === "grid"}
            {#if selectedGame}
                <div class="detail-full">
                    {#key selectedGame.title}
                        <GameDetail
                            game={selectedGame}
                            view="grid"
                            on:close={() => {
                                selectedGame = null;
                                isGamePlaying = false;
                                dispatch("gamestatechange", {
                                    title: "games",
                                    showBackButton: false,
                                });
                            }}
                            on:play={handlePlay}
                        />
                    {/key}
                </div>
            {:else}
                <div class="grid-view" on:scroll={handleScroll}>
                    {#each visibleGames as game (game.title)}
                        <!-- @ts-ignore -->
                        <div
                            on:click={() => (selectedGame = game as any)}
                            role="button"
                            tabindex="0"
                            on:keydown={(e: any) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    selectedGame = game as any;
                                }
                            }}
                        >
                            <GameCard {game} />
                        </div>
                    {/each}
                </div>
            {/if}
        {:else}
            <div class="list-view" on:scroll={handleScroll}>
                {#each visibleGames as game (game.title)}
                    <!-- @ts-ignore -->
                    <div
                        on:click={() => (selectedGame = game as any)}
                        role="button"
                        tabindex="0"
                        on:keydown={(e: any) => {
                            if (e.key === "Enter" || e.key === " ") {
                                selectedGame = game as any;
                            }
                        }}
                    >
                        <GameListItem
                            {game}
                            on:toggleFavorite={() => toggleFavorite(game)}
                        />
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if currentView === "list" && selectedGame}
        <div
            class="detail-view"
            transition:fly={{ x: 200, duration: 500, easing: quintOut }}
        >
            <GameDetail
                game={selectedGame}
                view="list"
                on:close={() => {
                    selectedGame = null;
                    isGamePlaying = false;
                    dispatch("gamestatechange", {
                        title: "games",
                        showBackButton: false,
                    });
                }}
                on:play={handlePlay}
            />
        </div>
    {/if}
</div>

<style>
    .cyanide-container {
        font-family: "monospace", monospace;
        color: #e0e0e0;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background-color: #0a0a0a;
    }

    .cyanide-container.list-view-details-open {
        flex-direction: row;
    }

    .main-view {
        flex: 3;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .cyanide-container.list-view-details-open .main-view {
        border-right: 1px solid #444;
    }

    .detail-view {
        flex: 2;
        overflow-y: auto;
    }

    .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 20px;
        gap: 20px;
    }

    .search-bar {
        flex-grow: 1;
    }

    .search-bar input {
        width: 100%;
        background-color: #111;
        color: #e0e0e0;
        border: 1px solid #222;
        border-radius: 16px;
        padding: 8px 16px;
        font-family: "monospace", monospace;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
    }

    .search-bar input:focus {
        border-color: var(--accent-cyan, #50e3c2);
        box-shadow: 0 0 0 2px rgba(80, 227, 194, 0.1);
    }

    .view-switcher button {
        background-color: #222;
        color: #e0e0e0;
        border: 1px solid #444;
        border-radius: 20px;
        padding: 5px 10px;
        cursor: pointer;
        font-family: "monospace", monospace;
    }

    .view-switcher button.active {
        background-color: #e0e0e0;
        color: #0d0d0d;
    }

    .error {
        color: #ff5555;
    }

    .grid-view {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
        flex-grow: 1;
        overflow-y: auto;
        padding: 20px;
    }

    .list-view {
        flex-grow: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .detail-full {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }
</style>
