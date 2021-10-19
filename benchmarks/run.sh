#!/bin/bash

set -xe

function build_benchmarks () {
  function build_benchmark () {
    if [ $1 == true ]; then OUTPUT_DIR="dist/size/$2/main"; else OUTPUT_DIR="dist/size/$2"; fi
    PLATFORM=$2 npm --prefix ./benchmarks run size:build -- -o ${WORKSPACE_ROOT}/benchmarks/$OUTPUT_DIR
  }

  build_benchmark $1 "web"
  build_benchmark $1 "webext"
  build_benchmark $1 "node"
  # The Qt benchmark is just the Glean.js compiled lib for Qt
  if [ $1 == true ]; then OUTPUT_DIR="dist/size/qt/main"; else OUTPUT_DIR="dist/size/qt"; fi
  mkdir -p ${WORKSPACE_ROOT}/benchmarks/${OUTPUT_DIR}
  cp ${WORKSPACE_ROOT}/glean/dist/qt/org/mozilla/Glean/glean.lib.js ${WORKSPACE_ROOT}/benchmarks/${OUTPUT_DIR}/glean.lib.js
}

ORIGINAL_WORKSPACE_ROOT="$( cd "$(dirname "$0")/.." ; pwd -P )"

##############################
# Benchmark the current code #
##############################

WORKSPACE_ROOT=${ORIGINAL_WORKSPACE_ROOT}
cd ${WORKSPACE_ROOT}

npm --prefix ./benchmarks install
npm --prefix ./benchmarks run link:glean
build_benchmarks false

#############################
# Benchmark the main branch #
#############################

tmpdir=$(mktemp -d)
git worktree add --force "${tmpdir}" 1732350-benchmarks-update

WORKSPACE_ROOT=${tmpdir}
pushd "${tmpdir}"
npm --prefix ./benchmarks install
npm --prefix ./benchmarks run link:glean
build_benchmarks true
cp -a "${tmpdir}/benchmarks/dist" "${ORIGINAL_WORKSPACE_ROOT}/benchmarks"
popd
git worktree remove --force "${tmpdir}"

# Post the details
node --experimental-json-modules benchmarks/size/report.js
