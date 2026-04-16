<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";

    export let currentUrl = "";

    let inputUrl = "";
    let iframeElement: HTMLIFrameElement | null = null;
    let iframeContainer: HTMLDivElement;
    let isLoading = false;

    const dispatch = createEventDispatcher();

    function formatUrl(url: string) {
        let finalUrl = url;
        const searchUrl = "https://search.brave.com/search?q=";

        if (finalUrl.startsWith("about:srcdoc") || finalUrl === "cyan:newtab") return finalUrl;

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

    onMount(() => {
        window.addEventListener("message", handleIframeMessage);
    });

    onDestroy(() => {
        window.removeEventListener("message", handleIframeMessage);
        if (iframeElement && iframeContainer) {
            iframeContainer.removeChild(iframeElement);
            iframeElement = null;
        }
    });

    async function handleIframeMessage(event: MessageEvent) {
        if (!event.data) return;

        if (event.data.type === "navigation") {
            let url = event.data.url;
            if (url.includes("about:srcdoc")) {
                url = url.replace(/.*?about:srcdoc\??/, "");
                const base = new URL(currentUrl === "cyan:newtab" ? "https://search.brave.com" : currentUrl);
                url = new URL(url, base.origin + base.pathname).href;
            }
            if (url !== currentUrl && url !== currentUrl + "/" && currentUrl !== url + "/") {
                navigate(url);
            }
        } else if (event.data.type === "url-update") {
            inputUrl = event.data.url;
            currentUrl = event.data.url;
        }
    }

    function initializeChromium() {
        if (!iframeContainer || iframeElement) return;
        iframeElement = document.createElement("iframe");
        iframeElement.title = "Chromium Proxy";
        iframeElement.style.width = "100%";
        iframeElement.style.height = "100%";
        iframeElement.style.border = "none";
        iframeElement.style.background = "#202124";
        iframeElement.setAttribute("allow", "fullscreen; geolocation; microphone; camera;");
        iframeElement.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation");
        iframeContainer.appendChild(iframeElement);
        navigate("cyan:newtab");
    }

    $: if (iframeContainer && !iframeElement) {
        initializeChromium();
    }

    function goBack() { try { iframeElement?.contentWindow?.history.back(); } catch (e) {} }
    function goForward() { try { iframeElement?.contentWindow?.history.forward(); } catch (e) {} }
    function refresh() { if (inputUrl) navigate(inputUrl); }

    function handleKeydown(e: KeyboardEvent) { if (e.key === "Enter") navigate(inputUrl); }

    const PROXY_URL = "/proxy.html#";

    async function navigate(url: string) {
        let finalUrl = formatUrl(url);
        inputUrl = finalUrl === "cyan:newtab" ? "" : finalUrl;
        currentUrl = finalUrl;
        
        console.log("[chromium] launching proxy in new tab:", finalUrl);

        if (finalUrl === "cyan:newtab") {
            // keep the landing page as an iframe or whatever
            return;
        }

        window.open(PROXY_URL + finalUrl, "_blank");
        isLoading = false;
    }

    export { goBack, goForward, refresh, navigate, inputUrl };
</script>

<div class="browser-container">
    <div class="navbar">
        <div class="nav-controls">
            <button on:click={refresh} title="Refresh">
                <span class="material-symbols-outlined">refresh</span>
            </button>
        </div>
        <div class="address-bar">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" bind:value={inputUrl} on:keydown={handleKeydown} placeholder="search or enter address..." />
        </div>
    </div>
    <div class="iframe-wrapper">
        <div style="color:#fff; text-align:center; padding-top:50px;">
            <p>proxy is now launching in a new tab to avoid origin restrictions.</p>
        </div>
    </div>
</div>

<style>
    .browser-container { display: flex; flex-direction: column; height: 100%; width: 100%; background: #000; }
    .navbar { height: 48px; background: #000; display: flex; align-items: center; padding: 0 12px; gap: 12px; border-bottom: 1px solid #111; }
    .nav-controls { display: flex; gap: 4px; }
    .nav-controls button { background: transparent; border: none; color: #e8eaed; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; }
    .nav-controls button:hover { background: rgba(255, 255, 255, 0.1); }
    .nav-controls button .material-symbols-outlined { font-size: 20px; }
    .address-bar { flex-grow: 1; height: 32px; background: #111; border-radius: 16px; display: flex; align-items: center; padding: 0 16px; gap: 8px; border: 1px solid #222; transition: border-color 0.2s, box-shadow 0.2s; }
    .address-bar:focus-within { border-color: var(--accent-cyan); box-shadow: 0 0 0 2px rgba(80, 227, 194, 0.1); }
    .search-icon { font-size: 16px; color: #555; }
    .address-bar input { flex-grow: 1; background: transparent; border: none; color: #fff; font-family: var(--font-mono); font-size: 13px; outline: none; }
    .address-bar input::placeholder { color: #444; }
    .loader { width: 14px; height: 14px; border: 2px solid rgba(80, 227, 194, 0.3); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .warning { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ccc; text-align: center; }
    .warning .material-symbols-outlined { font-size: 64px; margin-bottom: 20px; color: #ffcc00; }
    .warning h3 { margin: 0; font-size: 24px; color: var(--accent-cyan); }
    .warning p { margin: 10px 0 20px; font-family: var(--font-mono); }
    .warning button { padding: 10px 20px; border: 1px solid var(--border-color); background: #111; color: white; cursor: pointer; border-radius: 5px; font-family: var(--font-mono); }
    .warning button:hover { background: #222; border-color: var(--accent-cyan); }
    .warning .error-text { color: #ff6b6b; font-size: 13px; margin: 5px 0; }
    .iframe-wrapper { flex: 1; position: relative; min-height: 0; overflow: hidden; }
    .iframe-wrapper :global(iframe) { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
</style>
