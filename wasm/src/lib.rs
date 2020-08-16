use console_error_panic_hook::hook;
use js_sys::Array;
use nest_analyzer::tree;
use std::panic;
use wasm_bindgen::prelude::{wasm_bindgen, JsValue};

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub fn tree(filename: String, src: String) -> Array {
  panic::set_hook(Box::new(hook));
  tree::analyze_dependencies(&filename, &src, true)
    .unwrap()
    .into_iter()
    .map(JsValue::from)
    .collect()
}
