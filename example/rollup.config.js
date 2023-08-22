import rust from "@wasm-tool/rollup-plugin-rust";
import serve from "rollup-plugin-serve";
import terser from "@rollup/plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const is_watch = !!process.env.ROLLUP_WATCH;

export default {
    input: {
        index: "./src/js/index.js",
        main: "./src/js/main.js",
        worker: "./src/js/worker.js",
    },
    output: {
        dir: "dist/js",
        format: "esm",
        sourcemap: true,
    },
    plugins: [
        nodeResolve(),

        rust({
            serverPath: "/js/",
            inlineWasm: true,
            cargoArgs: [
                "--config", `build.rustflags=["-C","target-feature=+atomics,+bulk-memory"]`,
                "-Z", "build-std=panic_abort,std",
            ],
        }),

        is_watch && serve({
            contentBase: "dist",
            open: true,

            // Needed to make SharedArrayBuffer work
            headers: {
                "Cross-Origin-Embedder-Policy": "require-corp",
                "Cross-Origin-Opener-Policy": "same-origin",
            },

            // Needed to make .wasm work
            mimeTypes: {
                "application/wasm": ["wasm"],
            }
        }),

        //!is_watch && terser(),
    ],
};
