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

/// Rule `ban-deno-run` (CheckDenoRun)
pub struct CheckDenoRun;

/// Create rule for `ban-deno-run`
impl Rule for CheckDenoRun {
  /// Creates self reference
  fn new() -> Box<Self> {
    Box::new(CheckDenoRun)
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
    opt: Option<AnalyzeOptions>,
  ) {
    let mut visitor = CheckDenoRunVisitor::new(context, opt);
    visitor.visit_module(module, module);
  }
}

/// Create new module visitor
struct CheckDenoRunVisitor {
  context: Arc<Context>,
  options: Option<AnalyzeOptions>,
}

impl CheckDenoRunVisitor {
  pub fn new(context: Arc<Context>, options: Option<AnalyzeOptions>) -> Self {
    Self { context, options }
  }
  /// Check for `Deno.run` in a CallExpr
  fn check_callee(&self, callee_name: &Expr, _span: Span) -> Option<bool> {
    if let Expr::Member(expr) = &callee_name {
      let callee_name = self.get_obj(expr.obj.clone()).unwrap();
      if let "Deno" = callee_name.as_str() {
        let prop = self.get_prop(expr.prop.clone()).unwrap();
        if let "run" = prop.as_str() {
          return Some(true);
        }
      }
    }
    None
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

impl Visit for CheckDenoRunVisitor {
  /// Visit every CallExpr and check for callee
  fn visit_call_expr(&mut self, call_expr: &CallExpr, _parent: &dyn Node) {
    if let ExprOrSuper::Expr(expr) = &call_expr.callee {
      if let Some(_) = self.check_callee(expr, call_expr.span) {
        for args in &call_expr.args {
          if let Expr::Object(obj) = &*args.expr {
            for i in &obj.props {
              if let swc_ecma_ast::PropOrSpread::Prop(s) = &i {
                if let swc_ecma_ast::Prop::KeyValue(prop) = &**s {
                  if let swc_ecma_ast::PropName::Ident(i) = &prop.key {
                    if i.sym.to_string() == "cmd".to_string() {
                      if let swc_ecma_ast::Expr::Lit(swc_ecma_ast::Lit::Str(
                        e,
                      )) = &*prop.value
                      {
                        if e.value.to_string()
                          == self.options.as_ref().unwrap().data
                        {
                          self.context.add_diagnostic(
                            e.span,
                            "check-deno-run",
                            format!(
                              "`{}` call as function is not allowed",
                              &e.value.to_string()
                            )
                            .as_ref(),
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::tests::*;

  #[test]
  fn ban_deno_run_ok() {
    assert_ok::<CheckDenoRun>(
      r#"
      Deno.compile();
      Deno.smthElse();
      Deno.run({ cmd: "echo I AM SAFE" });
    "#,
      Some(crate::analyzer::AnalyzeOptions {
        data: "sh badfile.sh".to_string(),
      }),
    );
  }

  #[test]
  fn ban_deno_run_err() {
    assert_ok_err::<CheckDenoRun>(
      r#"
      Deno.run({ cmd: "sh badfilehaha.sh" });
    "#,
      Some(crate::analyzer::AnalyzeOptions {
        data: "sh badfilehaha.sh".to_string(),
      }),
    );
  }
}
