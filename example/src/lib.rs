use wasm_bindgen::prelude::*;
use rayon::prelude::*;
use thread_pool::ThreadPool;

pub use thread_pool::initialize_worker;


fn sum(numbers: &[i32]) -> i32 {
    numbers.par_iter().sum()
}


#[wasm_bindgen]
pub async fn main_js(url: web_sys::Url) -> Result<(), JsValue> {
    console_error_panic_hook::set_once();

    console_log::init_with_level(log::Level::Debug).unwrap_throw();

    ThreadPool::builder()
        .url(url)
        .build().await?;

    log::info!("{}", sum(&[100; 20000000]));

    Ok(())
}
