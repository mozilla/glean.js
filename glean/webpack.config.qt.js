/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path, { dirname } from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT = "glean.lib.js";

/**
 * Hacky plugin that removes ".js" extensions from imports before resolving.
 *
 * ts-loader does not have support for ESM imports yet.
 * See: https://github.com/TypeStrong/ts-loader/issues/1110
 */
class TsResolvePlugin {
  apply(resolver) {
    const target = resolver.ensureHook("internalResolve");
    resolver.getHook("resolve")
      .tapAsync("TsResolvePlugin", (request, resolveContext, callback) => {
        // If the request ends with ".js", remove the ending.
        const correctedRequest = request.request.replace(/.js$/, "");
        const obj = Object.assign({}, request, {
          request: correctedRequest
        });
        return resolver.doResolve(target, obj, null, resolveContext, callback);
      });
  }
}

/**
 * Plugin to remove the "use strict" statement added by Webpack before emmiting final bundle.
 *
 * Context on why this is necessary: https://github.com/101arrowz/fflate/pull/75#issuecomment-865016941,
 * tl;dr; "use strict" makes accessing a negative index throw an error in QML,
 * and not anywhere else.
 */
class RemoveUseStrictPlugin {
  apply(compiler) {
    compiler.hooks.shouldEmit.tap("RemoveUseStrictPlugin", compilation => {
      compilation.assets[OUTPUT]._value = compilation.assets[OUTPUT]._value.replace("\"use strict\";", "");
      return true;
    });
  }
}

export default {
  entry: "./src/index/qt.ts",
  mode: "production",
  optimization: {
    usedExports: true,
    providedExports: true,
    sideEffects: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          onlyCompileBundledFiles: true,
          // This path is resolved relative to the entry file, ./src/index/qt.ts
          // See: https://github.com/TypeStrong/ts-loader#configfile
          configFile: "../../tsconfig/qt.json"
        },
      },
    ],
  },
  resolve: {
    modules: ["node_modules"],
    extensions: [ ".tsx", ".ts", ".js" ],
    plugins: [
      new TsResolvePlugin()
    ]
  },
  plugins: [
    new RemoveUseStrictPlugin(),
  ],
  output: {
    path: path.resolve(__dirname, "dist/qt/org/mozilla/Glean"),
    filename: OUTPUT,
    libraryTarget: "var",
    library: "Glean",
  }
};
