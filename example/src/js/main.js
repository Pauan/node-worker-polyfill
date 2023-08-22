/*import wasm from "../../Cargo.toml";
const { main_js } = await wasm();
main_js(new URL("worker.js", import.meta.url));*/

console.log("MAIN");

const worker1 = new Worker(new URL("worker.js", import.meta.url), {
    type: "module"
});

worker1.addEventListener("message", (event) => {
    console.log("WORKER1");
    console.log(event.data);
});

worker1.postMessage("--WORKER1 MESSAGE");
worker1.postMessage("--WORKER1 MESSAGE!");
worker1.postMessage("--WORKER1 MESSAGE!!");
worker1.postMessage("--WORKER1 MESSAGE!!!");
console.log("WORKER1 POST MESSAGE");

const worker2 = new Worker(new URL("worker.js", import.meta.url), {
    type: "module"
});

worker2.addEventListener("message", (event) => {
    console.log("WORKER2");
    console.log(event.data);
});

worker2.postMessage("--WORKER2 MESSAGE");
console.log("WORKER2 POST MESSAGE");
