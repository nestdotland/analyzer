use console_error_panic_hook::hook;
use js_sys::Array;
use std::panic;
use wasm_bindgen::prelude::{wasm_bindgen, JsValue};

use nest_analyzer::analyzer::Analyzer;
use nest_analyzer::checks::get_static_rules;
use nest_analyzer::swc_util::get_default_ts_config;
use nest_analyzer::tree;

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

#[wasm_bindgen]
pub fn analyze(src: String) -> Array {
  Analyzer::new(get_default_ts_config(), get_static_rules())
    .analyze("test.ts".to_string(), src, None)
    .unwrap()
    .into_iter()
    .map(|d| JsValue::from_serde(&d).unwrap())
    .collect()
}
