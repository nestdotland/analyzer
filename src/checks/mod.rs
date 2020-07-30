use crate::analyzer::Context;
use std::sync::Arc;

pub mod ban_deno_run;

/// An analyzer rule trait is represented here
///
/// # Example
///
/// ```
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

/// List of certain recommended rules
pub fn get_recommended_rules() -> Vec<Box<dyn Rule>> {
  vec![ban_deno_run::BanDenoRun::new()]
}
