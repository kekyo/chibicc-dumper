/* global value */
int global_value;

// ignored by blank line

// function comment line 1
// function comment line 2
int documented_function(void) {
  return global_value;
}

struct Pair {
  // first member
  int first;

  /* second member */
  int second;
};

struct Pair pair_value;
