#!/bin/sh

set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ARTIFACT_ROOT="$PROJECT_ROOT/artifacts"
PACKAGE_NAME=chibicc-dumper

LINUX_MATRIX=$(cat <<'EOF'
debian bookworm x86_64 amd64
debian bookworm i686 i386
debian bookworm arm64 arm64
debian bookworm armv7l armhf
debian trixie x86_64 amd64
debian trixie i686 i386
debian trixie arm64 arm64
debian trixie armv7l armhf
debian trixie riscv64 riscv64
ubuntu 22.04 x86_64 amd64
ubuntu 22.04 arm64 arm64
ubuntu 24.04 x86_64 amd64
ubuntu 24.04 arm64 arm64
EOF
)

fail() {
	printf '%s\n' "$*" >&2
	exit 1
}

assert_file() {
	[ -f "$1" ] || fail "Missing expected file: $1"
}

assert_contains() {
	target_path=$1
	expected_text=$2
	grep -F "$expected_text" "$target_path" >/dev/null 2>&1 || fail "Missing expected text in $target_path: $expected_text"
}

deb_artifact_path() {
	version=$1
	distro=$2
	release=$3
	deb_arch=$4
	printf '%s\n' "$ARTIFACT_ROOT/deb/${PACKAGE_NAME}-${version}-${distro}-${release}-${deb_arch}.deb"
}

expected_elf_class() {
	case $1 in
		x86_64 | arm64 | riscv64)
			printf '%s\n' 'ELF64'
			;;
		i686 | armv7l)
			printf '%s\n' 'ELF32'
			;;
		*)
			fail "Unsupported ELF class lookup: $1"
			;;
	esac
}

expected_elf_machine() {
	case $1 in
		x86_64)
			printf '%s\n' 'Advanced Micro Devices X86-64'
			;;
		i686)
			printf '%s\n' 'Intel 80386'
			;;
		arm64)
			printf '%s\n' 'AArch64'
			;;
		armv7l)
			printf '%s\n' 'ARM'
			;;
		riscv64)
			printf '%s\n' 'RISC-V'
			;;
		*)
			fail "Unsupported ELF machine lookup: $1"
			;;
	esac
}

cd "$PROJECT_ROOT"

help_output=$(./build_pack.sh --help)
printf '%s\n' "$help_output" | grep -F -- '--distro <list>' >/dev/null 2>&1 || fail 'Missing --distro option in help output'
printf '%s\n' "$help_output" | grep -F -- '--release <list>' >/dev/null 2>&1 || fail 'Missing --release option in help output'
printf '%s\n' "$help_output" | grep -F -- '--arch <list>' >/dev/null 2>&1 || fail 'Missing --arch option in help output'
printf '%s\n' "$help_output" | grep -F -- '--jobs <count>' >/dev/null 2>&1 || fail 'Missing --jobs option in help output'

expected_default_version=$(printf '%s\n' '{version}' | screw-up format | tr -d '\r')
actual_default_version=$(./build_pack.sh --print-version)
[ "$actual_default_version" = "$expected_default_version" ] || fail "Unexpected default version: $actual_default_version"
parallel_version=$(./build_pack.sh --jobs 1 --print-version)
[ "$parallel_version" = "$expected_default_version" ] || fail "Unexpected version with --jobs: $parallel_version"

if ./build_pack.sh --jobs 0 --print-version >/dev/null 2>&1; then
	fail '--jobs 0 unexpectedly succeeded'
fi

if ./build_pack.sh --version "$expected_default_version" --distro fedora >/dev/null 2>&1; then
	fail '--distro fedora unexpectedly succeeded'
fi

VERSION=${CHIBICC_DUMPER_PACK_TEST_VERSION:-$expected_default_version}
PACK_BUILD_JOBS=${CHIBICC_DUMPER_PACK_TEST_JOBS:-8}
rm -rf "$ARTIFACT_ROOT"
./build_pack.sh \
	--version "$VERSION" \
	--jobs "$PACK_BUILD_JOBS"

deb_count=$(find "$ARTIFACT_ROOT/deb" -type f -name '*.deb' | wc -l | tr -d ' ')
[ "$deb_count" = '13' ] || fail "Unexpected deb artifact count: $deb_count"

while IFS=' ' read -r distro release arch deb_arch; do
	[ -n "$distro" ] || continue
	package_path=$(deb_artifact_path "$VERSION" "$distro" "$release" "$deb_arch")
	assert_file "$package_path"
	[ "$(dpkg-deb -f "$package_path" Package)" = "$PACKAGE_NAME" ] || fail "Unexpected Package field in $package_path"
	[ "$(dpkg-deb -f "$package_path" Architecture)" = "$deb_arch" ] || fail "Unexpected Architecture field in $package_path"
	[ "$(dpkg-deb -f "$package_path" Version)" = "$VERSION" ] || fail "Unexpected Version field in $package_path"

	depends_value=$(dpkg-deb -f "$package_path" Depends)
	case $depends_value in
		*libc6*)
			:
			;;
		*)
			fail "Unexpected Depends field in $package_path: $depends_value"
			;;
	esac
done <<EOF
$LINUX_MATRIX
EOF

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT INT TERM HUP

native_package_path=$(deb_artifact_path "$VERSION" debian bookworm amd64)
package_path=$native_package_path
dpkg-deb -x "$package_path" "$tmp_dir"

assert_file "$tmp_dir/usr/bin/$PACKAGE_NAME"
assert_file "$tmp_dir/usr/lib/$PACKAGE_NAME/$PACKAGE_NAME"

[ "$(readlink "$tmp_dir/usr/bin/$PACKAGE_NAME")" = "../lib/$PACKAGE_NAME/$PACKAGE_NAME" ] ||
	fail "Unexpected symlink target: $tmp_dir/usr/bin/$PACKAGE_NAME"

for header_path in "$PROJECT_ROOT"/include/*.h; do
	header_name=$(basename "$header_path")
	assert_file "$tmp_dir/usr/lib/$PACKAGE_NAME/include/$header_name"
done

assert_file "$tmp_dir/usr/share/doc/$PACKAGE_NAME/LICENSE"
assert_file "$tmp_dir/usr/share/doc/$PACKAGE_NAME/README.md"

output_path="$tmp_dir/preprocessed.txt"
printf '%s\n' 'NULL' | "$tmp_dir/usr/bin/$PACKAGE_NAME" -include stddef.h -E -o "$output_path" -xc -
assert_contains "$output_path" '0'

for sample in \
	"debian trixie i686 i386" \
	"debian trixie arm64 arm64" \
	"debian trixie armv7l armhf" \
	"debian trixie riscv64 riscv64"; do
	set -- $sample
	distro=$1
	release=$2
	arch=$3
	deb_arch=$4
	package_path=$(deb_artifact_path "$VERSION" "$distro" "$release" "$deb_arch")
	rm -rf "$tmp_dir/sample"
	dpkg-deb -x "$package_path" "$tmp_dir/sample"
	readelf -h "$tmp_dir/sample/usr/lib/$PACKAGE_NAME/$PACKAGE_NAME" >"$tmp_dir/readelf-$deb_arch.txt"
	assert_contains "$tmp_dir/readelf-$deb_arch.txt" "$(expected_elf_class "$arch")"
	assert_contains "$tmp_dir/readelf-$deb_arch.txt" "$(expected_elf_machine "$arch")"
done

echo OK
