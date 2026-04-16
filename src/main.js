import { mount } from 'svelte'
import 'katex/dist/katex.min.css'; // KaTeX CSS for math rendering
import './app.css'
import EpoxyTransport from "@mercuryworkshop/epoxy-transport";
import { connectWisp } from "./wispEndpoints.js";

// global proxy for testing/about:blank environments
async function initGlobalProxy() {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const forceProxy = urlParams.get('proxy') === 'true';
    const isRestricted =
        window.location.protocol === "about:" ||
        window.location.origin === "null" ||
        window.location.origin === null ||
        window.location.href === "about:blank" ||
        window.location.hostname.includes("googleusercontent.com");

    if (!isRestricted && !forceProxy) return;

    console.log("[proxy] initializing epoxy for restricted environment...");
    try {
        const { transport } = await connectWisp(EpoxyTransport);

        // 1. PATCH FETCH
        const originalFetch = window.fetch;
        window.fetch = async (input, init) => {
            const url = typeof input === "string" ? input : (input && input.url) || input.toString();

            const isHttp = url.startsWith("http");
            const host = window.location.host;
            const shouldProxy = 
                url.includes("googleapis.com") || 
                url.includes("firebase") || 
                url.includes("huggingface") ||
                url.includes("reds-exploit-corner.examprepare.help") ||
                (isRestricted && isHttp && (host === "" || !url.includes(host)));

            if (shouldProxy) {
                const method = init?.method || "GET";
                let headers = new Headers();
                if (init?.headers) {
                    if (init.headers instanceof Headers) headers = init.headers;
                    else if (Array.isArray(init.headers)) init.headers.forEach(([k, v]) => headers.set(k, v));
                    else Object.entries(init.headers).forEach(([k, v]) => headers.set(k, v));
                }

                try {
                    const resp = await transport.request(new URL(url), method, init?.body || null, headers);
                    const finalHeaders = new Headers();
                    if (resp.headers) {
                        if (Array.isArray(resp.headers)) {
                            resp.headers.forEach(([k, v]) => {
                                if (!["x-frame-options", "content-security-policy"].includes(k.toLowerCase())) {
                                    finalHeaders.set(k, v);
                                }
                            });
                        } else {
                            Object.entries(resp.headers).forEach(([k, v]) => {
                                if (!["x-frame-options", "content-security-policy"].includes(k.toLowerCase())) {
                                    finalHeaders.set(k, v);
                                }
                            });
                        }
                    }

                    // allow framing
                    finalHeaders.set("Access-Control-Allow-Origin", "*");

                    // pass the body directly as a stream
                    return new Response(resp.body, {
                        status: resp.status,
                        statusText: resp.statusText || 'OK',
                        headers: finalHeaders
                    });
                } catch (e) {
                    console.error("[proxy] fetch failed:", e);
                    return originalFetch(input, init);
                }
            }
            return originalFetch(input, init);
        };

        // 2. PATCH XHR
        const RealXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function () {
            const xhr = new RealXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            let targetUrl = "";
            let targetMethod = "";
            const requestHeaders = new Headers();

            xhr.open = function (method, url) {
                targetMethod = method;
                targetUrl = typeof url === 'string' ? url : (url && url.toString());
                return originalOpen.apply(xhr, arguments);
            };

            xhr.setRequestHeader = function (header, value) {
                requestHeaders.set(header, value);
                return RealXHR.prototype.setRequestHeader.apply(xhr, arguments);
            };

            xhr.send = async function (body) {
                const isHttp = targetUrl.startsWith("http");
                const host = window.location.host;
                const shouldProxy = 
                    targetUrl.includes("googleapis.com") || 
                    targetUrl.includes("firebase") ||
                    targetUrl.includes("reds-exploit-corner.examprepare.help") ||
                    (isRestricted && isHttp && (host === "" || !targetUrl.includes(host)));

                if (shouldProxy) {
                    try {
                        const resp = await transport.request(new URL(targetUrl), targetMethod, body, requestHeaders);

                        Object.defineProperty(xhr, 'status', { value: resp.status, writable: true });
                        Object.defineProperty(xhr, 'readyState', { value: 4, writable: true });

                        const respText = await new Response(resp.body).text();
                        Object.defineProperty(xhr, 'responseText', { value: respText, writable: true });
                        Object.defineProperty(xhr, 'response', { value: respText, writable: true });

                        if (xhr.onreadystatechange) xhr.onreadystatechange(new Event('readystatechange'));
                        if (xhr.onload) xhr.onload(new Event('load'));
                        xhr.dispatchEvent(new Event('readystatechange'));
                        xhr.dispatchEvent(new Event('load'));
                        return;
                    } catch (e) {
                        console.error("[proxy] XHR failed:", e);
                    }
                }
                return originalSend.apply(xhr, arguments);
            };
            return xhr;
        };

        console.log("[proxy] patches active");
    } catch (e) {
        console.error("[proxy] init failed:", e);
    }
}

// Dynamic import: App (and firebase.ts) must load AFTER proxy patches are applied,
// otherwise Firestore connects before fetch is intercepted.
initGlobalProxy().then(async () => {
    const { default: App } = await import('./App.svelte');
    mount(App, {
        target: document.getElementById('app'),
    })
});
