import "node-worker-polyfill";

// In order to use multi-threading the Wasm code must run in a Worker
new Worker(new URL("main.js", import.meta.url), {
    type: "module"
});
