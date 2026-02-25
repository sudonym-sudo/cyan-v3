<script lang="ts">
    export let link: string;
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
</script>

<div class="game-player">
    <iframe
        src={link}
        title="Game Player"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-pointer-lock"
        allow="pointer-lock"
        allowfullscreen
    ></iframe>
</div>

<style>
    .game-player {
        width: 100%;
        height: 100%;
        position: relative;
    }
    iframe {
        width: 100%;
        height: 100%;
        border: none;
    }
</style>
