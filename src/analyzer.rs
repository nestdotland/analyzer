use crate::checks::Rule;
use crate::diagnostic::Diagnostic;
use crate::scopes::Scope;
use crate::scopes::ScopeVisitor;
use crate::swc_ecma_ast;
use crate::swc_ecma_parser::Syntax;
use crate::swc_util::AstParser;
use crate::swc_util::SwcDiagnosticBuffer;
use instant::Instant;
use std::sync::Arc;
use std::sync::Mutex;
use swc_common::SourceMap;
use swc_common::Span;
use swc_ecma_visit::Visit;

/// An analyzer context
#[derive(Clone)]
pub struct Context {
  pub file_name: String,
  pub diagnostics: Arc<Mutex<Vec<Diagnostic>>>,
  pub source_map: Arc<SourceMap>,
  pub root_scope: Scope,
}

/// An analyzer options struct
#[derive(Clone)]
pub struct AnalyzeOptions {
  pub data: String,
}

impl Context {
  pub fn create_diagnostic(
    &self,
    span: Span,
    code: &str,
    message: &str,
  ) -> Diagnostic {
    let start = Instant::now();
    let location = self.source_map.lookup_char_pos(span.lo());
    let line_src = self
      .source_map
      .lookup_source_file(span.lo())
      .get_line(location.line - 1)
      .expect("error loading line soruce")
      .to_string();

    let snippet_length = self
      .source_map
      .span_to_snippet(self.source_map.span_until_char(span, '\n'))
      .expect("error loading snippet")
      .len();

    let diagnostic = Diagnostic {
      location: location.into(),
      message: message.to_string(),
      code: code.to_string(),
      line_src,
      snippet_length,
    };

    let end = Instant::now();
    debug!("Context::create_diagnostic took {:?}", end - start);
    diagnostic
  }

  pub fn add_diagnostic(&self, span: Span, code: &str, message: &str) {
    let diagnostic = self.create_diagnostic(span, code, message);
    let mut diags = self.diagnostics.lock().unwrap();
    diags.push(diagnostic);
  }
}

/// An analyzer
pub struct Analyzer {
  pub ast_parser: AstParser,
  pub syntax: Syntax,
  pub rules: Vec<Box<dyn Rule>>,
}

impl Analyzer {
  /// Creates a new analyzer with an AstParser
  pub fn new(syntax: Syntax, rules: Vec<Box<dyn Rule>>) -> Self {
    Analyzer {
      ast_parser: AstParser::new(),
      syntax,
      rules,
    }
  }
  /// Main method to analyze source code with Rules.
  pub fn analyze(
    &mut self,
    file_name: String,
    source_code: String,
    options: Option<AnalyzeOptions>,
  ) -> Result<Vec<Diagnostic>, SwcDiagnosticBuffer> {
    let start = Instant::now();
    let r = self.ast_parser.parse_module(
      &file_name,
      self.syntax,
      &source_code,
      |parse_result, _comments| {
        let end_parse_module = Instant::now();
        debug!(
          "ast_parser.parse_module took {:#?}",
          end_parse_module - start
        );
        let module = parse_result?;
        let diagnostics = self.check_module(file_name.clone(), module, options);
        Ok(diagnostics)
      },
    );
    let end = Instant::now();
    debug!("Analyzer::analyze took {:#?}", end - start);
    r
  }

  pub fn filter_diagnostics(&self, context: Arc<Context>) -> Vec<Diagnostic> {
    let diagnostics = context.diagnostics.lock().unwrap();
    diagnostics.to_vec()
  }

  pub fn check_module(
    &self,
    file_name: String,
    module: swc_ecma_ast::Module,
    options: Option<AnalyzeOptions>,
  ) -> Vec<Diagnostic> {
    let start = Instant::now();
    let mut scope_visitor = ScopeVisitor::default();
    let root_scope = scope_visitor.get_root_scope();
    scope_visitor.visit_module(&module, &module);

    let context = Arc::new(Context {
      file_name,
      diagnostics: Arc::new(Mutex::new(vec![])),
      source_map: self.ast_parser.source_map.clone(),
      root_scope,
    });

    for rule in &self.rules {
      rule.check_module(context.clone(), &module, options.clone());
    }

    let d = self.filter_diagnostics(context);
    let end = Instant::now();
    debug!("Analyzer::check_module took {:#?}", end - start);

    d
  }
}
