function patch($worker, $os) {
    globalThis.navigator = {
        hardwareConcurrency: 2,
        //hardwareConcurrency: $os.cpus().length,
    };

    globalThis.Worker = class Worker extends EventTarget {
        constructor(url, options = {}) {
            super();

            if (url instanceof URL) {
                if (url.protocol !== "file:") {
                    throw new Error("Worker only supports file: URLs");
                }

                url = url.pathname;

            } else {
                throw new Error("Filepaths are unreliable, use `new URL(\"...\", import.meta.url)` instead.");
            }

            const code = `
                ${patch.toString()}

                patch(require("node:worker_threads"), require("node:os"));

                const { workerData } = require("node:worker_threads");

                (async () => {
                    if (workerData.type === "module") {
                        await import("file://" + workerData.path);

                    } else {
                        throw new Error("Workers must use \`type: \\"module\\"\`");
                    }

                    __triggerWorkerLoaded__();

                })().catch((e) => {
                    console.error(e.stack);
                });
            `;

            this.worker = new $worker.Worker(code, {
                eval: true,
                workerData: {
                    path: url,
                    type: options.type,
                },
            });

            this.worker.on("message", (data) => {
                //console.log("MESSAGE");
                //console.log(data);
                this.dispatchEvent(new MessageEvent("message", { data }));
            });

            // TODO
            this.worker.on("messageerror", (error) => {});

            this.worker.on("error", (error) => {
                //console.log("ERROR");
                //console.log(error);
                const event = new Event("error");
                this.dispatchEvent(event);
            });
        }

        postMessage(value, transfer) {
            this.worker.postMessage(value, transfer);
        }

        // TODO
        terminate() {}
    };


    if (!$worker.isMainThread) {
        const makeSetter = (prop, event) => {
            let oldvalue;

            Object.defineProperty(globalThis, prop, {
                get() {
                    return oldvalue;
                },
                set(value) {
                    if (oldvalue) {
                        globalThis.removeEventListener(event, oldvalue);
                    }

                    oldvalue = value;

                    if (oldvalue) {
                        globalThis.addEventListener(event, oldvalue);
                    }
                },
            });
        };


        let pending = [];

        globalThis.__triggerWorkerLoaded__ = () => {
            pending.forEach((f) => {
                f();
            });

            pending = null;
        };

        const wait = (f) => {
            if (pending === null) {
                f();

            } else {
                pending.push(f);
            }
        };


        const memoize = (f) => {
            let run = false;

            return () => {
                if (!run) {
                    run = true;
                    f();
                }
            };
        };


        const startOnMessage = memoize(() => {
            $worker.parentPort.on("message", (data) => {
                //wait(() => {
                    workerEvents.dispatchEvent(new MessageEvent("message", { data }));
                //});
            });
        });

        const startOnMessageError = memoize(() => {
            // TODO
            $worker.parentPort.on("messageerror", (data) => {});
        });

        const startOnError = memoize(() => {
            $worker.parentPort.on("error", (data) => {
                //console.log("CHILD ERROR");
                //console.log(data);

                //wait(() => {
                    workerEvents.dispatchEvent(new Event("error"));
                //});
            });
        });


        const workerEvents = new EventTarget();

        // TODO
        globalThis.close = () => {};

        globalThis.addEventListener = (type, ...args) => {
            workerEvents.addEventListener(type, ...args);

            if (type === "message") {
                startOnMessage();
            } else if (type === "messageerror") {
                startOnMessageError();
            } else if (type === "error") {
                startOnError();
            }
        };

        globalThis.removeEventListener = (...args) => {
            workerEvents.removeEventListener(...args);
        };

        globalThis.postMessage = (value, transfer) => {
            $worker.parentPort.postMessage(value, transfer);
        };

        makeSetter("onmessage", "message");
        makeSetter("onmessageerror", "messageerror");
        makeSetter("onerror", "error");

        /*for (;;) {
            const data = $worker.receiveMessageOnPort($worker.parentPort);

            if (data === undefined) {
                break;

            } else {
                wait(() => {
                    console.log("CHILD START MESSAGE");
                    console.log(data);

                    workerEvents.dispatchEvent(new MessageEvent("message", { data }));
                });
            }
        }*/
    }
}


async function polyfill() {
    const [$worker, $os] = await Promise.all([
        import("node:worker_threads"),
        import("node:os"),
    ]);

    patch($worker, $os);
}

if (globalThis.Worker == null) {
    await polyfill();
}
