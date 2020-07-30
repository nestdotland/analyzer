use crate::analyzer::Context;
use std::sync::Arc;

pub mod ban_deno_run;

pub trait Rule {
  fn new() -> Box<Self>
  where
    Self: Sized;
  fn check_module(&self, context: Arc<Context>, module: &swc_ecma_ast::Module);
  fn code(&self) -> &'static str;
}

pub fn get_recommended_rules() -> Vec<Box<dyn Rule>> {
  vec![ban_deno_run::BanDenoRun::new()]
}
