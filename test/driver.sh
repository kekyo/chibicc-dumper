#!/bin/bash
set -euo pipefail

chibicc=$1

tmp=$(mktemp -d /tmp/chibicc-driver-XXXXXX)
trap 'rm -rf "$tmp"' INT TERM HUP EXIT
echo > "$tmp/empty.c"

check() {
    if [ $? -eq 0 ]; then
        echo "testing $1 ... passed"
    else
        echo "testing $1 ... failed"
        exit 1
    fi
}

# --help
$chibicc --help 2>&1 | grep -q chibicc-dumper
check --help

# -E
echo foo > "$tmp/out"
echo "#include \"$tmp/out\"" | $chibicc -E -xc - | grep -q foo
check -E

echo foo > "$tmp/out1"
echo "#include \"$tmp/out1\"" | $chibicc -E -o "$tmp/out2" -xc -
grep -q foo "$tmp/out2"
check '-E and -o'

# -I
mkdir "$tmp/dir"
echo foo > "$tmp/dir/i-option-test"
echo "#include \"i-option-test\"" | $chibicc -I"$tmp/dir" -E -xc - | grep -q foo
check -I

# -D
echo foo | $chibicc -Dfoo -E -xc - | grep -q 1
check -D

echo foo | $chibicc -Dfoo=bar -E -xc - | grep -q bar
check -D

# -U
echo foo | $chibicc -Dfoo=bar -Ufoo -E -xc - | grep -q foo
check -U

# ignored options
$chibicc -E -O -Wall -g -std=c11 -ffreestanding -fno-builtin \
         -fno-omit-frame-pointer -fno-stack-protector -fno-strict-aliasing \
         -m64 -mno-red-zone -w "$tmp/empty.c" >/dev/null
check 'ignored options'

# BOM marker
printf '\xef\xbb\xbfxyz\n' | $chibicc -E -o- -xc - | grep -q '^xyz'
check 'BOM marker'

# -idirafter
mkdir -p "$tmp/dir1" "$tmp/dir2"
echo foo > "$tmp/dir1/idirafter"
echo bar > "$tmp/dir2/idirafter"
echo "#include \"idirafter\"" | $chibicc -I"$tmp/dir1" -I"$tmp/dir2" -E -xc - | grep -q foo
check -idirafter
echo "#include \"idirafter\"" | $chibicc -idirafter "$tmp/dir1" -I"$tmp/dir2" -E -xc - | grep -q bar
check -idirafter

# -include
echo foo > "$tmp/out.h"
echo bar | $chibicc -include "$tmp/out.h" -E -o- -xc - | grep -q -z 'foo.*bar'
check -include
echo NULL | $chibicc -Iinclude -include stdio.h -E -o- -xc - | grep -q 0
check -include

# -x
echo foo | $chibicc -E -xc - | grep -q foo
check -xc

echo 'int x;' > "$tmp/foo.c"
$chibicc -E -x none -o "$tmp/foo.i" "$tmp/foo.c"
grep -q 'int x;' "$tmp/foo.i"
check '-x none'

# dependency output
echo '#include "out2.h"' > "$tmp/out.c"
echo '#include "out3.h"' >> "$tmp/out.c"
touch "$tmp/out2.h" "$tmp/out3.h"
$chibicc -M -I"$tmp" "$tmp/out.c" | grep -q -z '^out.o: .*/out\.c .*/out2\.h .*/out3\.h'
check -M

$chibicc -MF "$tmp/mf" -M -I"$tmp" "$tmp/out.c"
grep -q -z '^out.o: .*/out\.c .*/out2\.h .*/out3\.h' "$tmp/mf"
check -MF

$chibicc -MF "$tmp/mp" -MP -M -I"$tmp" "$tmp/out.c"
grep -q '^.*/out2.h:' "$tmp/mp"
check -MP
grep -q '^.*/out3.h:' "$tmp/mp"
check -MP

$chibicc -MT foo -M -I"$tmp" "$tmp/out.c" | grep -q '^foo:'
check -MT
$chibicc -MT foo -MT bar -M -I"$tmp" "$tmp/out.c" | grep -q '^foo bar:'
check -MT

echo '#include "out2.h"' > "$tmp/md2.c"
echo '#include "out3.h"' > "$tmp/md3.c"
(cd "$tmp"; $OLDPWD/$chibicc -MD -I. md2.c)
grep -q -z '^md2.o:.* md2\.c .* ./out2\.h' "$tmp/md2.d"
check -MD
(cd "$tmp"; $OLDPWD/$chibicc -MD -I. md3.c)
grep -q -z '^md3.o:.* md3\.c .* ./out3\.h' "$tmp/md3.d"
check -MD

$chibicc -MD -MF "$tmp/md-mf.d" -I. "$tmp/md2.c"
grep -q -z '^md2.o:.*md2\.c .*/out2\.h' "$tmp/md-mf.d"
check -MD

# #include_next
mkdir -p "$tmp/next1" "$tmp/next2" "$tmp/next3"
echo '#include "file1.h"' > "$tmp/file.c"
echo '#include_next "file1.h"' > "$tmp/next1/file1.h"
echo '#include_next "file2.h"' > "$tmp/next2/file1.h"
echo 'foo' > "$tmp/next3/file2.h"
$chibicc -I"$tmp/next1" -I"$tmp/next2" -I"$tmp/next3" -E "$tmp/file.c" | grep -q foo
check '#include_next'

# removed codegen-only options
! $chibicc -S "$tmp/empty.c" >/dev/null 2>&1
check 'removed -S'
! $chibicc -c "$tmp/empty.c" >/dev/null 2>&1
check 'removed -c'
! $chibicc -shared "$tmp/empty.c" >/dev/null 2>&1
check 'removed -shared'
! $chibicc -x assembler "$tmp/empty.c" >/dev/null 2>&1
check 'removed -x assembler'

# tool mode restrictions
! $chibicc "$tmp/empty.c" >/dev/null 2>&1
check 'requires output mode'

echo 'int x;' > "$tmp/a.c"
echo 'int y;' > "$tmp/b.c"
! $chibicc --dump-tokens "$tmp/a.c" "$tmp/b.c" >/dev/null 2>&1
check 'single input file'

$chibicc -hashmap-test
check hashmap

echo OK
