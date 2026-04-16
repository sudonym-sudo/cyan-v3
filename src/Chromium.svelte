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

    const PROXY_URL = "https://reds-exploit-corner.examprepare.help/embed.html";

    async function navigate(url: string) {
        let finalUrl = formatUrl(url);
        inputUrl = finalUrl === "cyan:newtab" ? "" : finalUrl;
        currentUrl = finalUrl;
        if (!iframeElement) return;
        isLoading = true;

        console.log("[chromium] navigating to:", finalUrl);

        if (finalUrl === "cyan:newtab") {
            const landingPage = `
            <!DOCTYPE html>
            <html style="background:#000; color:#fff; font-family:monospace; height:100%;">
            <head>
                <meta charset="UTF-8">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
            </head>
            <body style="margin:0; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
                <h1 style="font-family:'Instrument Serif', serif; font-weight:400; font-style:italic; font-size:96px; margin:0 0 40px 0; color:#fff; width:100%;">chromium</h1>
                <form id="search-form" style="width:80%; max-width:600px; display:flex; justify-content:center;">
                    <input name="q" autofocus autocomplete="off" placeholder="search..." style="width:100%; background:#111; border:1px solid #222; border-radius:30px; padding:15px 30px; color:#fff; font-size:18px; outline:none; font-family:inherit;">
                </form>
                <script>
                    document.getElementById('search-form').addEventListener('submit', e => {
                        e.preventDefault();
                        const q = e.target.q.value;
                        const url = "https://search.brave.com/search?q=" + encodeURIComponent(q);
                        window.parent.postMessage({ type: 'navigation', url: url }, '*');
                    });
                <\/script>
            </body>
            </html>`;
            iframeElement.removeAttribute("src");
            iframeElement.srcdoc = landingPage;
            isLoading = false;
            return;
        }

        try {
            console.log("[chromium] fetching proxy page...");
            const response = await fetch(PROXY_URL);
            if (!response.ok) throw new Error(`Proxy page fetch failed: ${response.status}`);
            
            let html = await response.text();
            console.log("[chromium] proxy page fetched, size:", html.length);
            
            const baseTag = '<base href="https://reds-exploit-corner.examprepare.help/">';
            // Since srcdoc doesn't have a URL hash, we manually set it so the internal scripts work.
            const hashFix = `
                <script>
                    window.location.hash = "#${finalUrl}";
                <\/script>
            `;

            if (html.includes("<head>")) {
                html = html.replace("<head>", `<head>${baseTag}${hashFix}`);
            } else if (html.includes("<html>")) {
                html = html.replace("<html>", `<html><head>${baseTag}${hashFix}</head>`);
            } else {
                html = baseTag + hashFix + html;
            }

            // Fix wispurl and worker path
            html = html.replace(/location\.host \+ "\/wisp\/"/g, '"reds-exploit-corner.examprepare.help/wisp/"');
            html = html.replace(/\/baremux\/worker\.js/g, '/workers/worker.js');

            console.log("[chromium] injecting srcdoc...");
            iframeElement.removeAttribute("src");
            iframeElement.srcdoc = html;
        } catch (err) {
            console.error("[chromium] proxy fetch failed:", err);
            const errorHtml = `
            <html><body style="background:#202124; color:#ff6b6b; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center; font-family:monospace;">
                <h3>Proxy Connection Error</h3>
                <p>${err}</p>
                <p>The proxy server or wisp connection might be down.</p>
                <button onclick="window.parent.postMessage({type:'navigation', url:'${finalUrl}'}, '*')" style="background:#333; color:#fff; border:1px solid #555; padding:8px 16px; cursor:pointer; border-radius:4px;">Retry</button>
            </body></html>`;
            iframeElement.removeAttribute("src");
            iframeElement.srcdoc = errorHtml;
        }
        
        setTimeout(() => { isLoading = false; }, 1500);
    }

    export { goBack, goForward, refresh, navigate, inputUrl };
</script>

<div class="browser-container">
    <div class="navbar">
        <div class="nav-controls">
            <button on:click={goBack} title="Back">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <button on:click={goForward} title="Forward">
                <span class="material-symbols-outlined">arrow_forward</span>
            </button>
            <button on:click={refresh} title="Refresh">
                <span class="material-symbols-outlined">refresh</span>
            </button>
        </div>
        <div class="address-bar">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" bind:value={inputUrl} on:keydown={handleKeydown} placeholder="search or enter address..." />
            {#if isLoading} <div class="loader"></div> {/if}
        </div>
    </div>
    <div class="iframe-wrapper" bind:this={iframeContainer}></div>
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
