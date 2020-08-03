// Copyright 2020 nest.land core team.

use super::AnalyzeOptions;
use super::Context;
use super::Rule;
use crate::unwrap_or_return;
use std::sync::Arc;
use swc_common::Span;
use swc_ecma_ast::CallExpr;
use swc_ecma_ast::Expr;
use swc_ecma_ast::ExprOrSuper;
use swc_ecma_visit::Node;
use swc_ecma_visit::Visit;

/// Rule `ban-deno-run` (BanDenoRun)
pub struct BanDenoRun;

/// Create rule for `ban-deno-run`
impl Rule for BanDenoRun {
  /// Creates self reference
  fn new() -> Box<Self> {
    Box::new(BanDenoRun)
  }
  /// Declare rule code
  fn code(&self) -> &'static str {
    "ban-deno-run"
  }
  /// Main entrypoint for module analysis
  fn check_module(
    &self,
    context: Arc<Context>,
    module: &swc_ecma_ast::Module,
    _opt: Option<AnalyzeOptions>,
  ) {
    let mut visitor = BanDenoRunVisitor::new(context);
    visitor.visit_module(module, module);
  }
}

/// Create new module visitor
struct BanDenoRunVisitor {
  context: Arc<Context>,
}

impl BanDenoRunVisitor {
  pub fn new(context: Arc<Context>) -> Self {
    Self { context }
  }
  /// Check for `Deno.run` in a CallExpr
  fn check_callee(&self, callee_name: &Expr, span: Span) -> () {
    if let Expr::Member(expr) = &callee_name {
      let callee_name = unwrap_or_return!(self.get_obj(expr.obj.clone()));
      if let "Deno" = callee_name.as_str() {
        let prop = unwrap_or_return!(self.get_prop(expr.prop.clone()));
        if let "run" = prop.as_str() {
          self.context.add_diagnostic(
            span,
            "no-deno-run",
            format!("`{}` call as function is not allowed", callee_name)
              .as_ref(),
          );
        }
      }
    }
  }
  /// Get member prop from a Expr
  fn get_prop(&self, expr: Box<Expr>) -> Option<String> {
    if let Expr::Ident(ident) = *expr {
      return Some(ident.sym.to_string());
    }
    None
  }

  /// Get member obj from a ExprOrSuper
  fn get_obj(&self, expr: ExprOrSuper) -> Option<String> {
    if let ExprOrSuper::Expr(ex) = expr {
      if let Expr::Ident(ident) = *ex {
        return Some(ident.sym.to_string());
      }
    }
    None
  }
}

impl Visit for BanDenoRunVisitor {
  /// Visit every CallExpr and check for callee
  fn visit_call_expr(&mut self, call_expr: &CallExpr, _parent: &dyn Node) {
    if let ExprOrSuper::Expr(expr) = &call_expr.callee {
      self.check_callee(expr, call_expr.span);
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::tests::*;

  #[test]
  fn ban_deno_run_ok() {
    assert_ok::<BanDenoRun>(
      r#"
      Deno.compile();
      Deno.smthElse();
    "#,
      None,
    );
  }

  #[test]
  fn ban_deno_run_err() {
    assert_ok_err::<BanDenoRun>(
      r#"
      Deno.run();
    "#,
      None,
    );
  }
}
