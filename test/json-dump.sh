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
python3 - "$tmp/tokens.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)

assert "types" in data
assert "tokens" in data
assert "ast" not in data

tokens = data["tokens"]
assert tokens[0]["kind"] == "TK_IDENT"
assert tokens[0]["lexeme"] == "int"
assert tokens[-1]["kind"] == "TK_EOF"
PY
echo "testing --dump-tokens ... passed"

"$chibicc" --dump-ast -o "$tmp/ast.json" "$tmp/simple.c"
python3 - "$tmp/ast.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)

assert "types" in data
assert "tokens" not in data
assert "ast" in data

globals_ = data["ast"]["globals"]
main_fns = [obj for obj in globals_ if obj["isFunction"] and obj["name"] == "main"]
assert len(main_fns) == 1
main_fn = main_fns[0]
assert main_fn["body"]["kind"] == "ND_BLOCK"
assert any(node["kind"] == "ND_RETURN" for node in main_fn["body"]["body"])
PY
echo "testing --dump-ast ... passed"

"$chibicc" --dump-tokens --dump-ast -o "$tmp/both.json" "$tmp/simple.c"
python3 - "$tmp/both.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)

assert "types" in data
assert "tokens" in data
assert "ast" in data
assert len(data["tokens"]) >= 2
assert data["ast"]["kind"] == "program"
PY
echo "testing combined dump ... passed"

echo OK
