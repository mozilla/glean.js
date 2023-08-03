#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as exec from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { argv, platform } from "process";
import { promisify } from "util";

import log, { LoggingLevel } from "./core/log.js";

const LOG_TAG = "CLI";

// The name of the directory which contains/will contain the Python virtual environment
// used to run the glean-parser.
//
// > When a virtual environment is active, the VIRTUAL_ENV environment variable
// > is set to the virtual environment's path. This can be used to check if
// > one is running inside a virtual environment.
//
// See: https://docs.python.org/3/library/venv.html
// (Also applies to envs created using `virtualenv` and `pyenv-virtualenv`)
const VIRTUAL_ENVIRONMENT_DIR = process.env.VIRTUAL_ENV || path.join(process.cwd(), ".venv");

// The version of glean_parser to install from PyPI.
const GLEAN_PARSER_VERSION = "8.1.1";

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
 * @returns `true` if the Python virtual environment exists and
 *          is accessible, `false` otherwise.
 */
async function checkPythonVenvExists(venvPath: string): Promise<boolean> {
  log(LOG_TAG, `Checking for a virtual environment at ${venvPath}`);

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
 * @returns `true` if the environment was correctly created, `false` otherwise.
 */
async function createPythonVenv(venvPath: string): Promise<boolean> {
  log(LOG_TAG, `Creating a virtual environment at ${venvPath}`);

  const pipFilename = (platform === "win32") ? "pip3.exe" : "pip3";
  const venvPip =
    path.join(getPythonVenvBinariesPath(VIRTUAL_ENVIRONMENT_DIR), pipFilename);

  const pipCmd = `${venvPip} install wheel`;
  const venvCmd = `${getSystemPythonBinName()} -m venv ${VIRTUAL_ENVIRONMENT_DIR}`;

  for (const cmd of [venvCmd, pipCmd]) {
    const spinner = getStartedSpinner();
    const {err, stdout, stderr} = await new Promise<{err: exec.ExecException | null, stdout: string, stderr: string}>(resolve => {
      exec.exec(cmd, (err, stdout, stderr) => resolve({err, stdout, stderr}));
    });

    stopSpinner(spinner);
    log(LOG_TAG, `${stdout}`);

    if (err) {
      log(LOG_TAG, `${stderr}`);
      return false;
    }
  }

  return true;
}

/**
 * Checks if a virtual environment for running the glean_parser exists,
 * otherwise it creates it.
 */
async function setup() {
  const venvExists = await checkPythonVenvExists(VIRTUAL_ENVIRONMENT_DIR);
  if (venvExists) {
    log(LOG_TAG, `Using virtual environment at ${VIRTUAL_ENVIRONMENT_DIR}`);
  } else if (!await createPythonVenv(VIRTUAL_ENVIRONMENT_DIR)){
    log(LOG_TAG, `Failed to create a virtual environment at ${VIRTUAL_ENVIRONMENT_DIR}`);
    process.exit(1);
  }
}

/**
 * Runs the glean_parser with the provided options.
 *
 * @param parserArgs the list of arguments passed to this command.
 */
async function runGlean(parserArgs: string[]) {
  const spinner = getStartedSpinner();
  const pythonBin = path.join(getPythonVenvBinariesPath(VIRTUAL_ENVIRONMENT_DIR), getSystemPythonBinName());
  const isOnlineArg = process.env.OFFLINE ? "offline" : "online";

  // Trying to pass PYTHON_SCRIPT as a string in the command line arguments
  // causes issues on Windows machines. The issue exists because you cannot
  // pass a multi-line script using the `-c` argument without manually formatting
  // your script with `\n` characters.
  //
  // To workaround this, we can write the script to a file inside of the OS tmpdir
  // and execute it from there. Then once we are finished with the script, we can
  // remove the entire directory.
  let tmpDir = "";
  const appPrefix = "glean.js";
  const scriptName = "script.py";
  const tempDirectory = os.tmpdir();
  try {
    tmpDir = fs.mkdtempSync(path.join(tempDirectory, appPrefix));
    fs.writeFileSync(path.join(tmpDir, scriptName), PYTHON_SCRIPT);
  } catch (error) {
    log(
      LOG_TAG,
      ["Unable to write utility script to tmp directory.\n", error],
      LoggingLevel.Error
    );
    process.exit(1);
  }

  const cmd = `${pythonBin} ${tmpDir}/${scriptName} ${isOnlineArg} glean_parser ${GLEAN_PARSER_VERSION} ${parserArgs.join(" ")}`;

  const {err, stdout, stderr} = await new Promise<{err: exec.ExecException | null, stdout: string, stderr: string}>(resolve => {
    exec.exec(cmd, (err, stdout, stderr) => {
      resolve({err, stdout, stderr});

      // Remove the temp directory now that we are finished with it.
      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  stopSpinner(spinner);
  log(LOG_TAG, `${stdout}`);

  if (err) {
    log(LOG_TAG, `${stderr}`);
    process.exit(1);
  }
}

/**
 * Returns a spinner
 *
 * @returns an Interval ID that logs certain characters
 */
function getStartedSpinner() {
  const ticks = ["\\", "|", "/", "-"];
  let i = 0;
  return setInterval(function() {
    process.stdout.write(" "+ticks[i++]+"\r\r");
    i %= 4;
  }, 250);
}

/**
 * Stops the spinner
 *
 * @param spinner is created by getStartedSpinner
 */
function stopSpinner(spinner: NodeJS.Timeout) {
  process.stdout.write("  \r");
  clearInterval(spinner);
}

/**
 * Runs the command.
 *
 * @param args the arguments passed to this process.
 */
async function run(args: string[]) {
  if (args.includes("--glean-parser-version")) {
    console.log(GLEAN_PARSER_VERSION);
    process.exit(1);
  }

  try {
    await setup();
  } catch (err) {
    log(
      LOG_TAG,
      ["Failed to setup the Glean build environment.\n", err],
      LoggingLevel.Error
    );
    process.exit(1);
  }

  await runGlean(args.slice(2));
}

// For discoverability, try to leave this function as the last one on this file.
run(argv).catch(e => {
  log(LOG_TAG, ["There was an error running Glean.\n", e], LoggingLevel.Error);
  process.exit(1);
});
