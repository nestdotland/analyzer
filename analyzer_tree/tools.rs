// Copyright 2020 nest.land core team.

#[macro_export]
macro_rules! unwrap_or_return {
  ( $e:expr ) => {
    match $e {
      Some(x) => x,
      None => return,
    }
  };
}
