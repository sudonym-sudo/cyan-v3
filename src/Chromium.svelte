<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";

    export let currentUrl = "";

    let inputUrl = "";
    let iframeElement: HTMLIFrameElement | null = null;
    let iframeContainer: HTMLDivElement;
    let hasAcceptedWarning = false;

    const PROXY_BASE = "https://fastforwarder.org/uv/service/";

    const dispatch = createEventDispatcher();

    function xorEncode(str: string) {
        if (!str) return str;
        return encodeURIComponent(
            str
                .toString()
                .split("")
                .map((char, ind) =>
                    ind % 2
                        ? String.fromCharCode(char.charCodeAt(0) ^ 2)
                        : char,
                )
                .join(""),
        );
    }

    function getProxiedUrl(url: string) {
        let finalUrl = url;
        const searchUrl = "https://www.google.com/search?q=";

        if (!finalUrl.includes(".")) {
            finalUrl = searchUrl + encodeURIComponent(finalUrl);
        } else if (
            !finalUrl.startsWith("http://") &&
            !finalUrl.startsWith("https://")
        ) {
            finalUrl = "https://" + finalUrl;
        }

        return PROXY_BASE + xorEncode(finalUrl);
    }

    function acceptWarning() {
        hasAcceptedWarning = true;
    }

    function initializeChromium() {
        if (!iframeContainer || iframeElement) return;

        iframeElement = document.createElement("iframe");
        iframeElement.title = "Chromium Proxy";
        iframeElement.src = getProxiedUrl("https://google.com");
        iframeElement.style.width = "100%";
        iframeElement.style.height = "100%";
        iframeElement.style.border = "none";
        iframeElement.style.background = "#202124";
        iframeElement.setAttribute(
            "allow",
            "fullscreen; geolocation; microphone; camera;",
        );
        iframeElement.setAttribute(
            "sandbox",
            "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation",
        );
        iframeContainer.appendChild(iframeElement);
    }

    onMount(() => {
        if (hasAcceptedWarning) {
            initializeChromium();
        }
    });

    $: if (hasAcceptedWarning && iframeContainer && !iframeElement) {
        initializeChromium();
    }

    onDestroy(() => {
        if (iframeElement && iframeContainer) {
            iframeContainer.removeChild(iframeElement);
            iframeElement = null;
        }
    });

    function goBack() {
        try {
            iframeElement?.contentWindow?.history.back();
        } catch (e) {}
    }
    function goForward() {
        try {
            iframeElement?.contentWindow?.history.forward();
        } catch (e) {}
    }
    function refresh() {
        try {
            iframeElement?.contentWindow?.location.reload();
        } catch (e) {
            if (iframeElement) {
                const currentSrc = iframeElement.src;
                iframeElement.src = "about:blank";
                setTimeout(() => {
                    if (iframeElement) iframeElement.src = currentSrc;
                }, 10);
            }
        }
    }
    function navigate(url: string) {
        inputUrl = url;
        if (iframeElement) {
            iframeElement.src = getProxiedUrl(url);
        }
    }

    export { goBack, goForward, refresh, navigate, inputUrl };
</script>

<div class="browser-container">
    {#if !hasAcceptedWarning}
        <div class="warning">
            <span class="material-symbols-outlined">warning</span>
            <h3>Proxy WIP</h3>
            <p>
                This proxy is a work-in-progress and may be blocked by some
                extensions.
            </p>
            <button on:click={acceptWarning}>Ok, Proceed</button>
        </div>
    {:else}
        <div class="iframe-wrapper" bind:this={iframeContainer}></div>
    {/if}
</div>

<style>
    .browser-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #202124;
    }

    .warning {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #ccc;
        text-align: center;
    }

    .warning .material-symbols-outlined {
        font-size: 64px;
        margin-bottom: 20px;
        color: #ffcc00;
    }

    .warning h3 {
        margin: 0;
        font-size: 24px;
    }

    .warning p {
        margin: 10px 0 20px;
    }

    .warning button {
        padding: 10px 20px;
        border: 1px solid #555;
        background: #333;
        color: white;
        cursor: pointer;
        border-radius: 5px;
    }

    .iframe-wrapper {
        flex: 1;
        position: relative;
        min-height: 0;
        overflow: hidden;
    }

    .iframe-wrapper :global(iframe) {
        position: absolute;
        top: -34px;
        left: 0;
        width: 100%;
        height: calc(100% + 34px);
    }
</style>
