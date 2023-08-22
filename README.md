# node-worker-polyfill

Polyfill for Node that adds support for web Workers


# Incompatibilities

These are the known incompatibilities with the browser:

* The URL must be a `URL` object, it cannot be a string:

   ```js
   // ERROR
   new Worker("foo.js", { type: "module" })
   ```

   ```js
   // Correct
   new Worker(new URL("foo.js", import.meta.url), { type: "module" })
   ```

* Only the `file://` protocol is supported:

   ```js
   // ERROR
   new Worker(new URL("http://foo/"), { type: "module" })
   ```

   ```js
   // Correct
   new Worker(new URL("foo.js", import.meta.url), { type: "module" })

   // Correct
   new Worker(new URL("file:///path/to/foo.js"), { type: "module" })
   ```

* You must use `type: "module"`:

   ```js
   // ERROR
   new Worker(new URL("foo.js", import.meta.url))
   ```

   ```js
   // Correct
   new Worker(new URL("foo.js", import.meta.url), { type: "module" })
   ```

* This polyfill queues up all messages until the Worker uses `addEventListener`:

   ```js
   // worker.js
   await foo();

   addEventListener("message", (event) => {
      console.log(event.data);
   });
   ```

   In the browser, the above code will not trigger the `message` event listener, because the event listener
   is added *after* `foo()` finishes, so the messages are simply lost.

   But with this polyfill, the messages will be queued, so it will trigger the `message` event listener.

   This only matters if you delay using `addEventListener`, if you use `addEventListener` immediately then
   there is no difference with the browser.

* `console.log` does not behave correctly with Workers, this is a [known bug with Node](https://github.com/nodejs/node/issues/30491).
