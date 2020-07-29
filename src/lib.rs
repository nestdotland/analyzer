// Copyright 2020 nest.land authors and friends.
#[macro_use]
extern crate lazy_static;

#[macro_use]
extern crate log;

pub mod analyzer;
pub mod checks;
pub mod diagnostic;
mod scopes;
pub mod swc_util;

pub use swc_atoms;
pub use swc_common;
pub use swc_ecma_ast;
pub use swc_ecma_parser;
pub use swc_ecma_visit;
