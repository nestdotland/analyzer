use crate::analyzer::Context;
use std::sync::Arc;

pub mod ban_deno_plugin;
pub mod ban_deno_run;

/// An analyzer rule trait is represented here
///
/// # Example
///
/// ```
///  use nest_analyzer::checks::Rule;
///  use std::sync::Arc;
///  use nest_analyzer::analyzer::Context;
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
///    fn check_module(&self, context: Arc<Context>, module: &swc_ecma_ast::Module) {
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
  fn check_module(&self, context: Arc<Context>, module: &swc_ecma_ast::Module);
  /// Code for a particular rule for example `no-foo-bar`
  fn code(&self) -> &'static str;
}

/// Get all rules
pub fn get_all_rules() -> Vec<Box<dyn Rule>> {
  vec![
    ban_deno_run::BanDenoRun::new(),
    ban_deno_plugin::BanDenoPlugin::new(),
  ]
}
