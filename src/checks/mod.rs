use crate::analyzer::AnalyzeOptions;
use crate::analyzer::Context;
use std::sync::Arc;

pub mod ban_deno_plugin;
pub mod ban_deno_run;
pub mod check_deno_run;

/// An analyzer rule trait is represented here
///
/// # Example
///
/// ```
///  use nest_analyzer::checks::Rule;
///  use std::sync::Arc;
///  use nest_analyzer::analyzer::{AnalyzeOptions, Context};
///
///  pub struct ARule;
///
///  impl Rule for ARule {
///    fn new() -> Box<Self> {
///      Box::new(ARule)
///    }
///
///    fn code(&self) -> &'static str {
///      "a-rule"
///    }
///
///    fn check_module(&self, context: Arc<Context>, module: &swc_ecma_ast::Module, options: Option<AnalyzeOptions>) {
///      // implement your module visitor here
///    }
///  }
/// ```
pub trait Rule {
  /// Creates a new reference of self
  fn new() -> Box<Self>
  where
    Self: Sized;
  /// Module analysis method for the rule
  fn check_module(
    &self,
    context: Arc<Context>,
    module: &swc_ecma_ast::Module,
    options: Option<AnalyzeOptions>,
  );
  /// Code for a particular rule for example `no-foo-bar`
  fn code(&self) -> &'static str;
}

/// Get all rules
pub fn get_all_rules() -> Vec<Box<dyn Rule>> {
  vec![
    ban_deno_run::BanDenoRun::new(),
    ban_deno_plugin::BanDenoPlugin::new(),
    check_deno_run::CheckDenoRun::new(),
  ]
}

// Get all rules that do are static (don't take any arguments)
pub fn get_static_rules() -> Vec<Box<dyn Rule>> {
  vec![
    ban_deno_run::BanDenoRun::new(),
    ban_deno_plugin::BanDenoPlugin::new(),
  ]
}
