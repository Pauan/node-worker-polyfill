//import wasm from "../../Cargo.toml";
//import { initializeWorker } from "../../thread-pool/worker.js";
//await initializeWorker(wasm);

console.log("WORKER");

/*addEventListener("message", (event) => {
    console.log("WORKER MESSAGE 1");
    console.log(event.data);
});

addEventListener("message", (event) => {
    console.log("WORKER MESSAGE 2");
    console.log(event.data);
});

addEventListener("message", (event) => {
    console.log("WORKER MESSAGE 3");
    console.log(event.data);
});*/

await new Promise((resolve) => {
    setTimeout(() => {
        resolve();
    }, 5000);
});

addEventListener("message", (event) => {
    console.log("WORKER MESSAGE 4");
    console.log(event.data);
});

const data = await new Promise((resolve) => {
    addEventListener("message", (event) => {
        resolve(event.data);
    });
});

console.log("WORKER MESSAGE");
console.log(data);
postMessage("--WORKER REPLY");
