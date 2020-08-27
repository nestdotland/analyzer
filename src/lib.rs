// Copyright 2020 nest.land authors and friends.
#![feature(box_patterns)]

pub mod analyzer;
pub mod checks;
pub mod diagnostic;
pub mod tree;

#[cfg(test)]
mod tests;

mod scopes;
pub mod swc_util;
mod tools;

pub use swc_atoms;
pub use swc_common;
pub use swc_ecma_ast;
pub use swc_ecma_parser;
pub use swc_ecma_visit;