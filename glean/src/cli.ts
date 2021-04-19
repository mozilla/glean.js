#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as exec from "child_process";
import * as fs from "fs";
import * as path from "path";
import { argv, platform } from "process";
import { promisify } from "util";

// The name of the directory which will contain the Python virtual environment
// used to run the glean-parser.
const VIRTUAL_ENVIRONMENT_DIR = ".venv";

// The version of glean_parser to install from PyPI.
const GLEAN_PARSER_VERSION = "3.1.1";

// This script runs a given Python module as a "main" module, like
// `python -m module`. However, it first checks that the installed
// package is at the desired version, and if not, upgrades it using `pip`.
//
// ** IMPORTANT**
// Keep this script in sync with the one in the Glean SDK (Gradle Plugin).
//
// Note: Groovy doesn't support embedded " in multi-line strings, so care
// should be taken to use ' everywhere in this code snippet.
const PYTHON_SCRIPT = `
import importlib
import subprocess
import sys
offline = sys.argv[1] == 'offline'
module_name = sys.argv[2]
expected_version = sys.argv[3]
try:
    module = importlib.import_module(module_name)
except ImportError:
    found_version = None
else:
    found_version = getattr(module, '__version__')
if found_version != expected_version:
    if not offline:
        subprocess.check_call([
            sys.executable,
            '-m',
            'pip',
            'install',
            '--upgrade',
            f'{module_name}=={expected_version}'
        ])
    else:
        print(f'Using Python environment at {sys.executable},')
        print(f'expected glean_parser version {expected_version}, found {found_version}.')
        sys.exit(1)
try:
    subprocess.check_call([
        sys.executable,
        '-m',
        module_name
    ] + sys.argv[4:])
except:
    # We don't need to show a traceback in this helper script.
    # Only the output of the subprocess is interesting.
    sys.exit(1)
`;

/**
 * Gets the name of the Python binary, based on the host OS.
 *
 * @returns the name of the Python executable.
 */
function getSystemPythonBinName(): string {
  return (platform === "win32") ? "python.exe" : "python3";
}

/**
 * Gets the full path to the directory containing the python
 * binaries in the virtual environment.
 *
 * Note that this directory changes depending on the host OS.
 *
 * @param venvRoot the root path of the virtual environment.
 *
 * @returns the full path to the directory containing the python
 *          binaries in the virtual environment.
 */
function getPythonVenvBinariesPath(venvRoot: string): string {
  if (platform === "win32") {
    return path.join(venvRoot, "Scripts");
  }

  return path.join(venvRoot, "bin");
}

/**
 * Checks if a Python virtual environment is available.
 *
 * @param venvPath the Python virtual environment directory.
 *
 * @returns `true` if the Python virtual environment exists and
 *          is accessible, `false` otherwise.
 */
async function checkPythonVenvExists(venvPath: string): Promise<boolean> {
  console.log(`Checking for a Glean virtual environment at ${venvPath}`);

  const venvPython =
    path.join(getPythonVenvBinariesPath(venvPath), getSystemPythonBinName());

  const access = promisify(fs.access);

  try {
    await access(venvPath, fs.constants.F_OK);
    await access(venvPython, fs.constants.F_OK);

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Uses the system's Python interpreter to create a Python3 virtual environment.
 *
 * @param venvPath the directory in which to create the virtual environment.
 *
 * @returns `true` if the environment was correctly created, `false` otherwise.
 */
async function createPythonVenv(venvPath: string): Promise<boolean> {
  console.log(`Creating a Glean virtual environment at ${venvPath}`);

  const pipFilename = (platform === "win32") ? "pip3.exe" : "pip3";
  const venvPip =
    path.join(getPythonVenvBinariesPath(VIRTUAL_ENVIRONMENT_DIR), pipFilename);

  const pipCmd = `${venvPip} install wheel`;
  const venvCmd = `${getSystemPythonBinName()} -m venv ${VIRTUAL_ENVIRONMENT_DIR}`;

  for (const cmd of [venvCmd, pipCmd]) {
    const {err, stdout, stderr} = await new Promise<{err: exec.ExecException | null, stdout: string, stderr: string}>(resolve => {
      exec.exec(cmd, (err, stdout, stderr) => resolve({err, stdout, stderr}));
    });

    if (err) {
      console.error(`${stdout}\n${stderr}`);
      return false;
    }
  }

  return true;
}

/**
 * Checks if a virtual environment for running the glean_parser exists,
 * otherwise it creates it.
 *
 * @param projectRoot the project's root directory.
 */
async function setup(projectRoot: string) {
  const venvRoot = path.join(projectRoot, VIRTUAL_ENVIRONMENT_DIR);

  const venvExists = await checkPythonVenvExists(venvRoot);
  if (venvExists) {
    console.log(`Using Glean virtual environment at ${venvRoot}`);
  } else if (!await createPythonVenv(venvRoot)){
    console.error(`Failed to create a Glean virtual environment at ${venvRoot}`);
  }
}

/**
 * Runs the glean_parser with the provided options.
 *
 * @param projectRoot the project's root directory.
 * @param parserArgs the list of arguments passed to this command.
 */
async function runGlean(projectRoot: string, parserArgs: string[]) {
  const venvRoot = path.join(projectRoot, VIRTUAL_ENVIRONMENT_DIR);
  const pythonBin = path.join(getPythonVenvBinariesPath(venvRoot), getSystemPythonBinName());
  const cmd = `${pythonBin} -c "${PYTHON_SCRIPT}" online glean_parser ${GLEAN_PARSER_VERSION} ${parserArgs.join(" ")}`;

  const {err, stdout, stderr} = await new Promise<{err: exec.ExecException | null, stdout: string, stderr: string}>(resolve => {
    exec.exec(cmd, (err, stdout, stderr) => resolve({err, stdout, stderr}));
  });

  if (err) {
    console.error(`${stdout}\n${stderr}`);
  }
}

/**
 * Runs the command.
 *
 * @param args the arguments passed to this process.
 */
async function run(args: string[]) {
  if (args.length < 3) {
    throw new Error("Not enough arguments. Please refer to https://mozilla.github.io/glean_parser/readme.html");
  }

  const projectRoot = process.cwd();
  try {
    await setup(projectRoot);
  } catch (err) {
    console.error("Failed to setup the Glean build environment", err);
  }

  await runGlean(projectRoot, args.slice(2));
}

run(argv).catch(e => {
  console.error("There was an error running Glean", e);
});
