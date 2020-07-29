// Copyright 2020 nest.land core team.

use super::Context;
use super::Rule;
use std::sync::Arc;
use swc_common::Span;
use swc_ecma_ast;
use swc_ecma_ast::CallExpr;
use swc_ecma_ast::Expr;
use swc_ecma_ast::ExprOrSuper;
use swc_ecma_visit::Node;
use swc_ecma_visit::Visit;

pub struct BanDenoRun;

impl Rule for BanDenoRun {
  fn new() -> Box<Self> {
    Box::new(BanDenoRun)
  }

  fn code(&self) -> &'static str {
    "ban-ts-comment"
  }

  fn check_module(&self, context: Arc<Context>, module: &swc_ecma_ast::Module) {
    let mut visitor = BanDenoRunVisitor::new(context);
    visitor.visit_module(module, module);
  }
}

struct BanDenoRunVisitor {
  context: Arc<Context>,
}

impl BanDenoRunVisitor {
  pub fn new(context: Arc<Context>) -> Self {
    Self { context }
  }

  fn check_callee(&self, callee_name: &Box<Expr>, span: Span) {
    if let Expr::Member(expr) = &callee_name.as_ref() {
      let callee_name = self.get_obj(expr.obj.clone()).unwrap();
      match callee_name.as_str() {
        "Deno" => {
          let prop = self.get_prop(expr.prop.clone()).unwrap();
          match prop.as_str() {
            "run" => {
              self.context.add_diagnostic(
                span,
                "no-deno-run",
                format!("`{}` call as function is not allowed", callee_name)
                  .as_ref(),
              );
            }
            _ => {}
          }
        }
        _ => {}
      }
    }
  }

  fn get_prop(&self, expr: Box<Expr>) -> Option<String> {
    if let Expr::Ident(ident) = *expr {
      return Some(ident.sym.to_string());
    }
    None
  }

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
    );
  }

  #[test]
  fn ban_deno_run_err() {
    assert_ok_err::<BanDenoRun>(
      r#"
      Deno.run();
    "#,
    );
  }
}
