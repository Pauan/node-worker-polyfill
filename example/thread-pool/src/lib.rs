use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use rayon::ThreadBuilder;
use futures::future::try_join_all;
use std::future::Future;
use spmc::{channel, Sender, Receiver};


#[wasm_bindgen(inline_js = r###"
    export function spawnWorker(url, module, memory, address) {
        return new Promise((resolve) => {
            const worker = new Worker(url, {
                type: "module",
            });

            worker.addEventListener("message", (event) => {
                resolve(worker);
            }, {
                capture: true,
                once: true,
            });

            worker.postMessage({
                module,
                memory,
                address,
            });
        });
    }
"###)]
extern "C" {
    #[wasm_bindgen(js_name = spawnWorker)]
    fn spawn_worker(
        url: &web_sys::Url,
        module: &JsValue,
        memory: &JsValue,
        address: *const Receiver<ThreadBuilder>,
    ) -> js_sys::Promise;
}


async fn spawn_workers(url: web_sys::Url, num_threads: usize) -> Result<Sender<ThreadBuilder>, JsValue> {
    let module = wasm_bindgen::module();
    let memory = wasm_bindgen::memory();

    let (sender, receiver) = channel();

    let receiver = Box::leak(Box::new(receiver));

    let workers = try_join_all((0..num_threads).map(|_| {
        JsFuture::from(spawn_worker(&url, &module, &memory, receiver))
    })).await?;

    // Needed to work around a Firefox bug where Workers get garbage collected too early
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1592227
    std::mem::forget(workers);

    Ok(sender)
}

async fn spawn_local_thread_pool(url: web_sys::Url, num_threads: usize) -> Result<rayon::ThreadPool, JsValue> {
    let mut sender = spawn_workers(url, num_threads).await?;

    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(num_threads)
        .spawn_handler(move |thread| {
            sender.send(thread).unwrap_throw();
            Ok(())
        })
        .build()
        .unwrap_throw();

    Ok(pool)
}

async fn spawn_global_thread_pool(url: web_sys::Url, num_threads: usize) -> Result<(), JsValue> {
    let mut sender = spawn_workers(url, num_threads).await?;

    rayon::ThreadPoolBuilder::new()
        .num_threads(num_threads)
        .spawn_handler(move |thread| {
            sender.send(thread).unwrap_throw();
            Ok(())
        })
        .build_global()
        .unwrap_throw();

    Ok(())
}


pub struct ThreadPool {
    url: Option<web_sys::Url>,
    num_threads: Option<usize>,
}

impl ThreadPool {
    pub fn builder() -> Self {
        Self {
            url: None,
            num_threads: None,
        }
    }

    pub fn url(mut self, url: web_sys::Url) -> Self {
        self.url = Some(url);
        self
    }

    pub fn num_threads(mut self, num_threads: usize) -> Self {
        self.num_threads = Some(num_threads);
        self
    }

    fn defaults(self) -> (web_sys::Url, usize) {
        (
            self.url.expect("Missing url for ThreadPool"),

            self.num_threads.unwrap_or_else(|| {
                let window: web_sys::Window = js_sys::global().unchecked_into();
                window.navigator().hardware_concurrency() as usize
            }),
        )
    }

    // TODO this should cleanup the receiver when the ThreadPool is dropped
    pub fn build_local(self) -> impl Future<Output = Result<rayon::ThreadPool, JsValue>> {
        let (url, num_threads) = self.defaults();
        spawn_local_thread_pool(url, num_threads)
    }

    pub fn build_global(self) -> impl Future<Output = Result<(), JsValue>> {
        let (url, num_threads) = self.defaults();
        spawn_global_thread_pool(url, num_threads)
    }
}


#[wasm_bindgen(js_name = initializeWorker)]
pub fn initialize_worker(receiver: *const Receiver<ThreadBuilder>) where Receiver<ThreadBuilder>: Sync {
    // This is safe because it uses `Box::leak` so the Receiver lives forever
    let receiver = unsafe { &*receiver };
    receiver.recv().unwrap_throw().run();
}
