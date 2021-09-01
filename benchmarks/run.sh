#!/bin/bash

set -xe

WORKSPACE_ROOT="$( cd "$(dirname "$0")/.." ; pwd -P )"
cd "$WORKSPACE_ROOT"

# Benchmark the main branch
tmpdir=$(mktemp -d)
git worktree add --force "${tmpdir}" main
pushd "${tmpdir}"
npm --prefix ./benchmarks install
npm --prefix ./benchmarks run size:build:main
cp -a "${tmpdir}/benchmarks/dist" "${WORKSPACE_ROOT}/benchmarks"
popd
git worktree remove --force "${tmpdir}"

# Benchmark the current code
npm --prefix ./benchmarks install
npm --prefix ./benchmarks run size:build

# Post the details
node --experimental-json-modules benchmarks/size/report.js
