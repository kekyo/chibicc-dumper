#!/bin/sh

set -eu

require_env() {
	var_name=$1
	eval "var_value=\${$var_name:-}"
	[ -n "$var_value" ] || {
		printf '%s\n' "Missing required environment variable: $var_name" >&2
		exit 1
	}
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || {
		printf '%s\n' "Missing required command: $1" >&2
		exit 1
	}
}

validate_positive_integer() {
	value_name=$1
	value=$2

	case $value in
		'' | *[!0-9]*)
			printf '%s\n' "$value_name must be a positive integer: $value" >&2
			exit 1
			;;
	esac

	[ "$value" -gt 0 ] || {
		printf '%s\n' "$value_name must be a positive integer: $value" >&2
		exit 1
	}
}

require_env CHIBICC_DUMPER_SOURCE_ROOT
require_env CHIBICC_DUMPER_WORK_DIR
require_env CHIBICC_DUMPER_META_DIR
require_env CHIBICC_DUMPER_PACKAGE_NAME
require_env CHIBICC_DUMPER_PACKAGE_VERSION
require_env CHIBICC_DUMPER_PACKAGE_DESCRIPTION
require_env CHIBICC_DUMPER_PACKAGE_MAINTAINER
require_env CHIBICC_DUMPER_PROJECT_HOMEPAGE

CHIBICC_DUMPER_MAKE_JOBS=${CHIBICC_DUMPER_MAKE_JOBS:-1}
validate_positive_integer 'CHIBICC_DUMPER_MAKE_JOBS' "$CHIBICC_DUMPER_MAKE_JOBS"

require_command apt-get

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
	build-essential \
	ca-certificates \
	dpkg-dev \
	tar

require_command dpkg-architecture
require_command dpkg-shlibdeps
require_command make
require_command tar

source_root=$CHIBICC_DUMPER_SOURCE_ROOT
work_dir=$CHIBICC_DUMPER_WORK_DIR
meta_dir=$CHIBICC_DUMPER_META_DIR
package_name=$CHIBICC_DUMPER_PACKAGE_NAME
build_root=/tmp/chibicc-dumper-build
pack_root=/tmp/chibicc-dumper-pack
pkg_root="$pack_root/debian/$package_name"
binary_dir="$pkg_root/usr/lib/$package_name"
include_dir="$binary_dir/include"
doc_dir="$pkg_root/usr/share/doc/$package_name"
control_dir="$pkg_root/DEBIAN"

rm -rf "$build_root" "$pack_root" "$work_dir" "$meta_dir"
mkdir -p "$build_root" "$control_dir" "$binary_dir" "$include_dir" "$doc_dir" "$pkg_root/usr/bin" "$work_dir" "$meta_dir"

tar -C "$source_root" \
	--exclude='./.git' \
	--exclude='./artifacts' \
	--exclude='./dist' \
	--exclude='./node_modules' \
	--exclude='./test_results' \
	-cf - . | tar --no-same-owner --no-same-permissions -C "$build_root" -xf -

cd "$build_root"
make clean
make -j "$CHIBICC_DUMPER_MAKE_JOBS"

cp "$build_root/$package_name" "$binary_dir/"
ln -s "../lib/$package_name/$package_name" "$pkg_root/usr/bin/$package_name"
cp "$build_root"/include/*.h "$include_dir/"
cp "$build_root/LICENSE" "$doc_dir/"
cp "$build_root/README.md" "$doc_dir/"

cat >"$pack_root/debian/control" <<EOF
Source: $package_name
Section: devel
Priority: optional
Maintainer: $CHIBICC_DUMPER_PACKAGE_MAINTAINER
Standards-Version: 4.6.0

Package: $package_name
Architecture: any
Description: $CHIBICC_DUMPER_PACKAGE_DESCRIPTION
EOF

depends_value=$(
	cd "$pack_root"
	dpkg-shlibdeps -O -e"debian/$package_name/usr/lib/$package_name/$package_name" |
		sed -n 's/^shlibs:Depends=//p'
)

deb_arch=$(dpkg-architecture -qDEB_HOST_ARCH)

{
	printf 'Package: %s\n' "$package_name"
	printf 'Version: %s\n' "$CHIBICC_DUMPER_PACKAGE_VERSION"
	printf 'Section: devel\n'
	printf 'Priority: optional\n'
	printf 'Architecture: %s\n' "$deb_arch"
	printf 'Maintainer: %s\n' "$CHIBICC_DUMPER_PACKAGE_MAINTAINER"
	if [ -n "$depends_value" ]; then
		printf 'Depends: %s\n' "$depends_value"
	fi
	printf 'Homepage: %s\n' "$CHIBICC_DUMPER_PROJECT_HOMEPAGE"
	printf 'Description: %s\n' "$CHIBICC_DUMPER_PACKAGE_DESCRIPTION"
	printf ' Dumps C language tokens and ASTs as JSON.\n'
} >"$control_dir/control"

mkdir -p "$work_dir/debian"
cp -a "$pack_root/debian/." "$work_dir/debian/"
printf '%s\n' "$deb_arch" >"$meta_dir/deb_arch"
