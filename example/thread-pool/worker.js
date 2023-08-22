export async function initializeWorker(wasm) {
    function wait() {
        return new Promise((resolve) => {
            addEventListener("message", (event) => {
                resolve(event.data);
            }, {
                capture: true,
                once: true,
            });
        });
    }

    /*const [initWasm, { module, memory, address }] = await Promise.all([
        wasm,
        wait(),
    ]);*/

    /*const exports = await initWasm({
        initializeHook: (init, path) => init(module, memory),
    });*/

    console.log("HELLO");

    postMessage(null);

    console.log("DONE");

    //exports.initializeWorker(address);
}
