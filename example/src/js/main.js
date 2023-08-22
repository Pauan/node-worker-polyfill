import wasm from "../../Cargo.toml";
const { main_js } = await wasm();
await main_js(new URL("worker.js", import.meta.url));
