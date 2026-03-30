#!/bin/bash
set -euo pipefail

chibicc=$1

tmp=$(mktemp -d /tmp/chibicc-json-test-XXXXXX)
trap 'rm -rf "$tmp"' INT TERM HUP EXIT

cat > "$tmp/simple.c" <<'EOF'
int main(void) {
  return 42;
}
EOF

"$chibicc" --dump-tokens -o "$tmp/tokens.json" "$tmp/simple.c"
node test/check-json-dump.mjs tokens "$tmp/tokens.json"
echo "testing --dump-tokens ... passed"

"$chibicc" --dump-ast -o "$tmp/ast.json" "$tmp/simple.c"
node test/check-json-dump.mjs ast "$tmp/ast.json"
echo "testing --dump-ast ... passed"

"$chibicc" --dump-tokens --dump-ast -o "$tmp/both.json" "$tmp/simple.c"
node test/check-json-dump.mjs both "$tmp/both.json"
echo "testing combined dump ... passed"

echo OK
