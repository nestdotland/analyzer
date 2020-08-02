// Copyright 2020 nest.land core team.

use super::AnalyzeOptions;
use super::Context;
use super::Rule;
use std::sync::Arc;
use swc_common::Span;
use swc_ecma_ast::CallExpr;
use swc_ecma_ast::Expr;
use swc_ecma_ast::ExprOrSuper;
use swc_ecma_visit::Node;
use swc_ecma_visit::Visit;

/// Rule `ban-deno-plugin` (BanDenoPlugin)
pub struct BanDenoPlugin;

/// Create rule for `ban-deno-plugin`
impl Rule for BanDenoPlugin {
  /// Creates self reference
  fn new() -> Box<Self> {
    Box::new(BanDenoPlugin)
  }
  /// Declare rule code
  fn code(&self) -> &'static str {
    "ban-deno-plugin"
  }
  /// Main entrypoint for module analysis
  fn check_module(
    &self,
    context: Arc<Context>,
    module: &swc_ecma_ast::Module,
    _opt: Option<AnalyzeOptions>,
  ) {
    let mut visitor = BanDenoPluginVisitor::new(context);
    visitor.visit_module(module, module);
  }
}

/// Create new module visitor
struct BanDenoPluginVisitor {
  context: Arc<Context>,
}

impl BanDenoPluginVisitor {
  pub fn new(context: Arc<Context>) -> Self {
    Self { context }
  }
  /// Check for `Deno.run` in a CallExpr
  fn check_callee(&self, callee_name: &Expr, span: Span) {
    if let Expr::Member(expr) = &callee_name {
      let callee_name = self.get_obj(expr.obj.clone()).unwrap();
      if let "Deno" = callee_name.as_str() {
        let prop = self.get_prop(expr.prop.clone()).unwrap();
        if let "openPlugin" = prop.as_str() {
          self.context.add_diagnostic(
            span,
            "ban-deno-plugin",
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

impl Visit for BanDenoPluginVisitor {
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
    assert_ok::<BanDenoPlugin>(
      r#"
      Deno.compile();
      let core = Deno.core;
    "#,
      None,
    );
  }

  #[test]
  fn ban_deno_run_err() {
    assert_ok_err::<BanDenoPlugin>(
      r#"
      Deno.openPlugin();
    "#,
      None,
    );
  }
}
