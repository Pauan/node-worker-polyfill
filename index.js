function patch($worker, $os) {
    // This is technically not a part of the Worker polyfill,
    // but Workers are used for multi-threading, so this is often
    // needed when writing Worker code.
    if (globalThis.navigator == null) {
        globalThis.navigator = {
            hardwareConcurrency: $os.cpus().length,
        };
    }

    globalThis.Worker = class Worker extends EventTarget {
        constructor(url, options = {}) {
            super();

            if (url instanceof URL) {
                if (url.protocol !== "file:") {
                    throw new Error("Worker only supports file: URLs");
                }

                url = url.href;

            } else {
                throw new Error("Filepaths are unreliable, use `new URL(\"...\", import.meta.url)` instead.");
            }

            if (options.type !== "module") {
                throw new Error("Workers must use \`type: \"module\"\`");
            }

            // This uses some funky stuff like `patch.toString()`.
            //
            // This is needed so that it can synchronously run the polyfill code
            // inside of the worker.
            //
            // It can't use `require` because the file doesn't have a `.cjs` file extension.
            //
            // It can't use `import` because that's asynchronous, and the file path
            // might be different if using a bundler.
            const code = `
                ${patch.toString()}

                // Inject the polyfill into the worker
                patch(require("node:worker_threads"), require("node:os"));

                const { workerData } = require("node:worker_threads");

                // This actually loads and runs the worker file
                import(workerData.url)
                    .catch((e) => {
                        // TODO maybe it should send a message to the parent?
                        console.error(e.stack);
                    });
            `;

            this.worker = new $worker.Worker(code, {
                eval: true,
                workerData: {
                    url,
                },
            });

            this.worker.on("message", (data) => {
                this.dispatchEvent(new MessageEvent("message", { data }));
            });

            this.worker.on("messageerror", (error) => {
                throw new Error("UNIMPLEMENTED");
            });

            this.worker.on("error", (error) => {
                // TODO attach the error to the event somehow
                const event = new Event("error");
                this.dispatchEvent(event);
            });
        }

        postMessage(value, transfer) {
            this.worker.postMessage(value, transfer);
        }

        terminate() {
            throw new Error("UNIMPLEMENTED");
        }
    };


    if (!$worker.isMainThread) {
        // This is used to create the onmessage, onmessageerror, and onerror setters
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

        // This makes sure that `f` is only run once
        const memoize = (f) => {
            let run = false;

            return () => {
                if (!run) {
                    run = true;
                    f();
                }
            };
        };


        // We only start listening for messages / errors when the worker calls addEventListener
        const startOnMessage = memoize(() => {
            $worker.parentPort.on("message", (data) => {
                workerEvents.dispatchEvent(new MessageEvent("message", { data }));
            });
        });

        const startOnMessageError = memoize(() => {
            throw new Error("UNIMPLEMENTED");
        });

        const startOnError = memoize(() => {
            $worker.parentPort.on("error", (data) => {
                workerEvents.dispatchEvent(new Event("error"));
            });
        });


        // Node workers don't have top-level events, so we have to make our own
        const workerEvents = new EventTarget();

        globalThis.close = () => {
            throw new Error("UNIMPLEMENTED");
        };

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
