// This is a fork of the `deno_lint` diagnostic utility.
// Copyright 2020 the Deno authors. All rights reserved. MIT license.
// Copyright 2020 nest.land core team.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Location {
  pub filename: String,
  pub line: usize,
  pub col: usize,
}

impl Into<Location> for swc_common::Loc {
  fn into(self) -> Location {
    use crate::swc_common::FileName::*;

    let filename = match &self.file.name {
      Real(path_buf) => path_buf.to_string_lossy().to_string(),
      Custom(str_) => str_.to_string(),
      _ => panic!("invalid filename"),
    };

    Location {
      filename,
      line: self.line,
      col: self.col.0,
    }
  }
}

/// A Diagnostic that will be returned after analysis
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Diagnostic {
  pub location: Location,
  pub message: String,
  pub code: String,
  pub line_src: String,
  pub snippet_length: usize,
}