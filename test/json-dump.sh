#!/bin/bash
set -euo pipefail

chibicc=$1

tmp=$(mktemp -d /tmp/chibicc-json-test-XXXXXX)
trap 'rm -rf "$tmp"' INT TERM HUP EXIT
results_dir="${TEST_RESULTS_DIR:?TEST_RESULTS_DIR is required}/json-dump"
mkdir -p "$results_dir"

cat > "$tmp/simple.c" <<'EOF'
int main(void) {
  return 42;
}
EOF

"$chibicc" --dump-tokens -o "$results_dir/simple.tokens.json" "$tmp/simple.c"
node test/check-json-dump.mjs tokens "$results_dir/simple.tokens.json"
echo "testing --dump-tokens ... passed"

"$chibicc" --dump-ast -o "$results_dir/simple.ast.json" "$tmp/simple.c"
node test/check-json-dump.mjs ast "$results_dir/simple.ast.json"
echo "testing --dump-ast ... passed"

"$chibicc" --dump-tokens --dump-ast -o "$results_dir/simple.both.json" "$tmp/simple.c"
node test/check-json-dump.mjs both "$results_dir/simple.both.json"
echo "testing combined dump ... passed"

echo OK
