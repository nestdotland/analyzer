import { pascalCase } from "https://deno.land/x/case/mod.ts";

function template(ruleCode: string = Deno.args[0]): string {
  return `
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

/// Rule ${ruleCode} (${pascalCase(ruleCode)})
pub struct BanDenoPlugin;

/// Create rule for ${ruleCode}
impl Rule for ${pascalCase(ruleCode)} {
  /// Creates self reference
  fn new() -> Box<Self> {
    Box::new(${pascalCase(ruleCode)})
  }
  /// Declare rule code
  fn code(&self) -> &'static str {
    "${ruleCode}"
  }
  /// Main entrypoint for module analysis
  fn check_module(
    &self,
    context: Arc<Context>,
    module: &swc_ecma_ast::Module,
    _opt: Option<AnalyzeOptions>,
  ) {
    let mut visitor = ${pascalCase(ruleCode)}Visitor::new(context);
    visitor.visit_module(module, module);
  }
}

/// Create new module visitor
struct ${pascalCase(ruleCode)}Visitor {
  context: Arc<Context>,
}

impl ${pascalCase(ruleCode)}Visitor {
  pub fn new(context: Arc<Context>) -> Self {
    Self { context }
  }
  /// Check for expr in a CallExpr
  fn check_callee(&self, callee_name: &Expr, span: Span) {
    if let Expr::Member(expr) = &callee_name {
      let callee_name = unwrap_or_return!(self.get_obj(expr.obj.clone()));
      if let "Deno" = callee_name.as_str() {
        let prop = unwrap_or_return!(self.get_prop(expr.prop.clone()));
        if let "openPlugin" = prop.as_str() {
          self.context.add_diagnostic(
            span,
            "${ruleCode}",
            "expr call as function is not allowed".as_ref(),
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

impl Visit for ${pascalCase(ruleCode)}Visitor {
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
    assert_ok::<${pascalCase(ruleCode)}>(
      r#"
      // Add tests that pass
    "#,
      None,
    );
  }

  #[test]
  fn ban_deno_run_err() {
    assert_ok_err::<${pascalCase(ruleCode)}>(
      r#"
      // Add tests that fail
    "#,
      None,
    );
  }
}
`;
}

console.log(template());
