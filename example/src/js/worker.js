import wasm from "../../Cargo.toml";
import { initializeWorker } from "../../thread-pool/worker.js";
await initializeWorker(wasm);
