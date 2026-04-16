<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let currentUrl = "";

    let inputUrl = "";
    let showLaunchUI = true;

    function formatUrl(url: string) {
        let finalUrl = url;
        const searchUrl = "https://search.brave.com/search?q=";

        if (finalUrl === "cyan:newtab") return finalUrl;

        if (!finalUrl.includes(".") && !finalUrl.includes("/") && !finalUrl.startsWith("http")) {
            finalUrl = searchUrl + encodeURIComponent(finalUrl);
        } else if (
            !finalUrl.startsWith("http://") &&
            !finalUrl.startsWith("https://")
        ) {
            finalUrl = "https://" + finalUrl;
        }

        return finalUrl;
    }

    function handleKeydown(e: KeyboardEvent) { if (e.key === "Enter") launchProxy(inputUrl); }

    function launchProxy(url: string) {
        let finalUrl = formatUrl(url);
        window.open('/proxy.html#' + encodeURIComponent(finalUrl), "_blank");
    }
</script>

<div class="browser-container">
    {#if showLaunchUI}
        <div class="launch-screen">
            <h1 class="title">Launching proxy in new tab</h1>
            <p class="subtitle">proxy requires embedding outside about:blank to work</p>
            <form class="search-form" on:submit|preventDefault={() => launchProxy(inputUrl)}>
                <input type="text" bind:value={inputUrl} placeholder="enter url..." />
                <button type="submit">Ok</button>
            </form>
        </div>
    {/if}
</div>

<style>
    .browser-container { display: flex; flex-direction: column; height: 100%; width: 100%; background: #000; color: #fff; font-family: monospace; }
    .launch-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; }
    .title { font-size: 32px; margin-bottom: 10px; color: var(--accent-cyan); }
    .subtitle { font-size: 16px; margin-bottom: 30px; color: #888; }
    .search-form { display: flex; gap: 10px; }
    .search-form input { background: #111; border: 1px solid #222; border-radius: 5px; padding: 10px; color: #fff; width: 300px; }
    .search-form button { background: #111; border: 1px solid #222; color: #fff; padding: 10px 20px; cursor: pointer; border-radius: 5px; }
    .search-form button:hover { background: #222; border-color: var(--accent-cyan); }
</style>