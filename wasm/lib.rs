use wasm_bindgen::prelude::*;
use nest_analyzer::analyzer::Analyzer;
use nest_analyzer::checks::get_static_rules;
use nest_analyzer::swc_util::get_default_ts_config;
use nest_analyzer::analyzer::AnalyzeOptions;

#[wasm_bindgen]
pub fn analyze(src: &str) -> String {
    let mut analyzer = Analyzer::new(get_default_ts_config(), get_static_rules());
    let diagnostics = Analyzer::analyze(
      &mut analyzer,
      "test".to_string(),
      src.to_string(),
      Default::default(),
    )
    .unwrap();
    if !diagnostics.is_empty() {
      panic!("Unexpected diagnostics: {:#?}", diagnostics);
    }
    "Ok".to_string()
  }