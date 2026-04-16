<script lang="ts">
    function launchProxy() {
        const targetUrl = "https://search.brave.com/";
        window.open('/proxy.html#' + encodeURIComponent(targetUrl), "_blank");
    }
</script>

<div class="browser-container">
    <div class="launch-screen">
        <button class="launch-button" on:click={launchProxy}>
            Launch Brave Proxy
        </button>
    </div>
</div>

<style>
    .browser-container { display: flex; flex-direction: column; height: 100%; width: 100%; background: #000; color: #fff; font-family: monospace; }
    .launch-screen { display: flex; align-items: center; justify-content: center; height: 100%; }
    .launch-button { background: #111; border: 1px solid #222; color: #fff; padding: 20px 40px; cursor: pointer; border-radius: 5px; font-size: 18px; }
    .launch-button:hover { background: #222; border-color: var(--accent-cyan); }
</style>