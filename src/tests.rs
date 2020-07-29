use crate::checks::Rule;
use crate::swc_util::get_default_ts_config;
use crate::analyzer::Analyzer;

pub fn assert_ok<T: Rule + 'static>(source: &str) {
  let rule = T::new();
  let mut analyzer =
    Analyzer::new(get_default_ts_config(), vec![rule]);
  let diagnostics =
    Analyzer::analyze(&mut analyzer, "test".to_string(), source.to_string())
      .unwrap();
  if !diagnostics.is_empty() {
    panic!("Unexpected diagnostics: {:#?}", diagnostics);
  }
}

pub fn assert_ok_err<T: Rule + 'static>(source: &str) {
  let rule = T::new();
  let mut analyzer =
    Analyzer::new(get_default_ts_config(), vec![rule]);
  let diagnostics =
    Analyzer::analyze(&mut analyzer, "test".to_string(), source.to_string())
      .unwrap();
   assert!(diagnostics.len() > 0);
}
