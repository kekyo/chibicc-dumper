#!/bin/sh

set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ARTIFACT_ROOT="$PROJECT_ROOT/artifacts"
PACKAGE_NAME=chibicc-dumper
PACKAGE_DESCRIPTION="A JSON dumper tool derived from chibicc that can output C language tokens and ASTs."
DEFAULT_MAINTAINER="chibicc-dumper packager <packager@localhost>"
PROJECT_HOMEPAGE="https://github.com/kekyo/chibicc-cpp"
DEFAULT_PARALLEL_JOB_CAP=14

LINUX_MATRIX=$(cat <<'EOF'
debian bookworm x86_64 linux/amd64
debian bookworm i686 linux/386
debian bookworm arm64 linux/arm64
debian bookworm armv7l linux/arm
debian trixie x86_64 linux/amd64
debian trixie i686 linux/386
debian trixie arm64 linux/arm64
debian trixie armv7l linux/arm
debian trixie riscv64 linux/riscv64
ubuntu 22.04 x86_64 linux/amd64
ubuntu 22.04 arm64 linux/arm64
ubuntu 24.04 x86_64 linux/amd64
ubuntu 24.04 arm64 linux/arm64
EOF
)

print_usage() {
	cat <<'EOF'
Usage: ./build_pack.sh [options]

Options:
  --version <version>  Debian package version. Defaults to a screw-up-derived version.
  --distro <list>      Comma-separated distro filter for deb builds.
  --release <list>     Comma-separated release filter for deb builds.
  --arch <list>        Comma-separated architecture filter.
  --jobs <count>       Maximum concurrent package jobs. Defaults to auto (up to 14).
  --print-version      Print the resolved package version and exit.
  --help               Show this help.
EOF
}

fail() {
	printf '%s\n' "$*" >&2
	exit 1
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

build_npm_package() {
	printf '%s\n' "[npm] npm install"
	npm install
	printf '%s\n' "[npm] npm run pack"
	npm run pack
}

validate_positive_integer() {
	value_name=$1
	value=$2

	case $value in
		'' | *[!0-9]*)
			fail "$value_name must be a positive integer: $value"
			;;
	esac

	[ "$value" -gt 0 ] || fail "$value_name must be a positive integer: $value"
}

detect_processor_count() {
	detected_count=''

	if command -v getconf >/dev/null 2>&1; then
		detected_count=$(getconf _NPROCESSORS_ONLN 2>/dev/null || true)
	fi
	if [ -z "$detected_count" ] && command -v nproc >/dev/null 2>&1; then
		detected_count=$(nproc 2>/dev/null || true)
	fi
	if [ -z "$detected_count" ] && command -v sysctl >/dev/null 2>&1; then
		detected_count=$(sysctl -n hw.ncpu 2>/dev/null || true)
	fi

	case $detected_count in
		'' | *[!0-9]*)
			detected_count=1
			;;
	esac

	if [ "$detected_count" -lt 1 ]; then
		detected_count=1
	fi

	printf '%s\n' "$detected_count"
}

min_int() {
	left_value=$1
	right_value=$2

	if [ "$left_value" -le "$right_value" ]; then
		printf '%s\n' "$left_value"
	else
		printf '%s\n' "$right_value"
	fi
}

detect_version() {
	require_command screw-up
	detected_version=$(printf '%s\n' '{version}' | screw-up format | tr -d '\r')
	[ -n "$detected_version" ] || fail 'screw-up did not return a version'
	printf '%s\n' "$detected_version"
}

validate_version() {
	case $1 in
		'' | *[!0-9A-Za-z.+:~\-]*)
			fail "Invalid package version: $1"
			;;
	esac
}

matches_filter() {
	filter_value=$1
	actual_value=$2

	if [ -z "$filter_value" ]; then
		return 0
	fi

	previous_ifs=$IFS
	IFS=','
	for allowed_value in $filter_value; do
		if [ "$allowed_value" = "$actual_value" ]; then
			IFS=$previous_ifs
			return 0
		fi
	done
	IFS=$previous_ifs
	return 1
}

count_deb_builds() {
	build_count=0

	while IFS=' ' read -r distro release arch platform; do
		[ -n "$distro" ] || continue
		matches_filter "$DISTRO_FILTER" "$distro" || continue
		matches_filter "$RELEASE_FILTER" "$release" || continue
		matches_filter "$ARCH_FILTER" "$arch" || continue
		build_count=$((build_count + 1))
	done <<EOF
$LINUX_MATRIX
EOF

	printf '%s\n' "$build_count"
}

choose_container_engine() {
	if [ -n "${CONTAINER_ENGINE:-}" ]; then
		engine_name=${CONTAINER_ENGINE##*/}
		[ "$engine_name" = 'podman' ] || fail 'Only podman is supported as the container engine'
		require_command "$CONTAINER_ENGINE"
		printf '%s\n' "$CONTAINER_ENGINE"
		return 0
	fi
	require_command podman
	printf '%s\n' 'podman'
}

container_image_for_target() {
	distro=$1
	release=$2
	arch=$3

	case $arch in
		x86_64)
			printf 'docker.io/library/%s:%s\n' "$distro" "$release"
			;;
		i686)
			printf 'docker.io/i386/%s:%s\n' "$distro" "$release"
			;;
		arm64)
			printf 'docker.io/arm64v8/%s:%s\n' "$distro" "$release"
			;;
		armv7l)
			printf 'docker.io/arm32v7/%s:%s\n' "$distro" "$release"
			;;
		riscv64)
			printf 'docker.io/library/%s:%s\n' "$distro" "$release"
			;;
		*)
			fail "Unsupported Debian package architecture: $arch"
			;;
	esac
}

build_deb_package() {
	distro=$1
	release=$2
	arch=$3
	platform=$4
	image=$(container_image_for_target "$distro" "$release" "$arch")
	resolved_image=$("$CONTAINER_ENGINE_BIN" pull --quiet --platform "$platform" "$image")
	work_root="$TMP_ROOT/deb/$distro/$release/$arch"
	container_release=$(printf '%s' "$release" | tr './:' '---')
	container_name="chibicc-dumper-${RUN_ID}-${distro}-${container_release}-${arch}-$$"
	container_export_root="/tmp/chibicc-dumper-export"
	work_dir="$container_export_root/work"
	meta_dir="$container_export_root/meta"
	package_dir="$ARTIFACT_ROOT/deb"

	printf '%s\n' "[deb] $distro $release $arch"
	mkdir -p "$package_dir"
	[ -n "$resolved_image" ] || fail "Failed to resolve container image: $image ($platform)"

	cleanup_container() {
		"$CONTAINER_ENGINE_BIN" rm -f "$container_name" >/dev/null 2>&1 || true
	}

	trap cleanup_container EXIT HUP INT TERM

	rm -rf "$work_root"
	mkdir -p "$work_root"

	"$CONTAINER_ENGINE_BIN" run \
		--name "$container_name" \
		-v "$PROJECT_ROOT:/workspace:ro" \
		-w /workspace \
		-e CHIBICC_DUMPER_RUN_ROOT="/workspace/artifacts/.tmp/$RUN_ID" \
		-e CHIBICC_DUMPER_SOURCE_ROOT=/workspace \
		-e CHIBICC_DUMPER_WORK_DIR="$work_dir" \
		-e CHIBICC_DUMPER_META_DIR="$meta_dir" \
		-e CHIBICC_DUMPER_PACKAGE_NAME="$PACKAGE_NAME" \
		-e CHIBICC_DUMPER_PACKAGE_VERSION="$VERSION" \
		-e CHIBICC_DUMPER_PACKAGE_DESCRIPTION="$PACKAGE_DESCRIPTION" \
		-e CHIBICC_DUMPER_PACKAGE_MAINTAINER="${DEB_MAINTAINER:-$DEFAULT_MAINTAINER}" \
		-e CHIBICC_DUMPER_PROJECT_HOMEPAGE="$PROJECT_HOMEPAGE" \
		-e CHIBICC_DUMPER_MAKE_JOBS="$MAKE_JOBS" \
		"$resolved_image" \
		./scripts/build_linux_dist_container.sh
	"$CONTAINER_ENGINE_BIN" cp "$container_name:$container_export_root/." "$work_root"
	cleanup_container
	trap - EXIT HUP INT TERM

	deb_arch=$(cat "$work_root/meta/deb_arch")
	package_path="$package_dir/${PACKAGE_NAME}-${VERSION}-${distro}-${release}-${deb_arch}.deb"
	rm -f "$package_path"
	dpkg-deb --root-owner-group --build \
		"$work_root/work/debian/$PACKAGE_NAME" \
		"$package_path" >/dev/null
}

wait_for_oldest_job() {
	[ "$ACTIVE_JOB_COUNT" -gt 0 ] || return 0

	set -- $ACTIVE_JOB_PIDS
	wait_pid=$1
	shift

	if wait "$wait_pid"; then
		:
	else
		JOB_FAILURE=1
	fi

	ACTIVE_JOB_PIDS=$*
	ACTIVE_JOB_COUNT=$((ACTIVE_JOB_COUNT - 1))
}

run_parallel_job() {
	while [ "$ACTIVE_JOB_COUNT" -ge "$PARALLEL_JOBS" ]; do
		wait_for_oldest_job
	done

	[ "$JOB_FAILURE" -eq 0 ] || fail 'One or more package builds failed'

	"$@" &
	ACTIVE_JOB_PIDS="${ACTIVE_JOB_PIDS}${ACTIVE_JOB_PIDS:+ }$!"
	ACTIVE_JOB_COUNT=$((ACTIVE_JOB_COUNT + 1))
}

wait_for_all_jobs() {
	while [ "$ACTIVE_JOB_COUNT" -gt 0 ]; do
		wait_for_oldest_job
	done

	[ "$JOB_FAILURE" -eq 0 ] || fail 'One or more package builds failed'
}

schedule_deb_builds() {
	while IFS=' ' read -r distro release arch platform; do
		[ -n "$distro" ] || continue
		matches_filter "$DISTRO_FILTER" "$distro" || continue
		matches_filter "$RELEASE_FILTER" "$release" || continue
		matches_filter "$ARCH_FILTER" "$arch" || continue
		run_parallel_job build_deb_package "$distro" "$release" "$arch" "$platform"
	done <<EOF
$LINUX_MATRIX
EOF
}

cleanup() {
	rm -rf "$TMP_ROOT"
}

VERSION=''
DISTRO_FILTER=''
RELEASE_FILTER=''
ARCH_FILTER=''
PARALLEL_JOBS=''
PRINT_VERSION='false'

while [ "$#" -gt 0 ]; do
	case $1 in
		--version)
			[ "$#" -ge 2 ] || fail 'Missing value for --version'
			VERSION=$2
			shift 2
			;;
		--distro)
			[ "$#" -ge 2 ] || fail 'Missing value for --distro'
			DISTRO_FILTER=$2
			shift 2
			;;
		--release)
			[ "$#" -ge 2 ] || fail 'Missing value for --release'
			RELEASE_FILTER=$2
			shift 2
			;;
		--arch)
			[ "$#" -ge 2 ] || fail 'Missing value for --arch'
			ARCH_FILTER=$2
			shift 2
			;;
		--jobs)
			[ "$#" -ge 2 ] || fail 'Missing value for --jobs'
			PARALLEL_JOBS=$2
			shift 2
			;;
		--help)
			print_usage
			exit 0
			;;
		--print-version)
			PRINT_VERSION='true'
			shift
			;;
		*)
			fail "Unknown argument: $1"
			;;
	esac
done

if [ -z "$VERSION" ]; then
	VERSION=$(detect_version)
fi
validate_version "$VERSION"

if [ -n "$PARALLEL_JOBS" ]; then
	validate_positive_integer '--jobs' "$PARALLEL_JOBS"
else
	PARALLEL_JOBS=$(min_int "$(detect_processor_count)" "$DEFAULT_PARALLEL_JOB_CAP")
fi

if [ "$PRINT_VERSION" = 'true' ]; then
	printf '%s\n' "$VERSION"
	exit 0
fi

require_command dpkg-deb
require_command npm

CONTAINER_ENGINE_BIN=$(choose_container_engine)
MAKE_JOBS=$PARALLEL_JOBS
DEB_BUILD_COUNT=$(count_deb_builds)
[ "$DEB_BUILD_COUNT" -gt 0 ] || fail 'No Debian package targets matched the current filters'

RUN_ID=$(date +%Y%m%d_%H%M%S_%N)
TMP_ROOT="$ARTIFACT_ROOT/.tmp/$RUN_ID"
ACTIVE_JOB_PIDS=''
ACTIVE_JOB_COUNT=0
JOB_FAILURE=0

mkdir -p "$ARTIFACT_ROOT/deb" "$TMP_ROOT"
trap cleanup EXIT HUP INT TERM

build_npm_package
schedule_deb_builds
wait_for_all_jobs
