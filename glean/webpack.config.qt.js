/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path, { dirname } from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  constructor(output) {
    this.output = output;
  }

  apply(compiler) {
    compiler.hooks.shouldEmit.tap("RemoveUseStrictPlugin", compilation => {
      if (compilation.assets[this.output]._children) {
        compilation.assets[this.output]._children[0]._value = compilation.assets[this.output]._children[0]._value.replace("\"use strict\";", "");
      } else {
        compilation.assets[this.output]._value = compilation.assets[this.output]._value?.replace("\"use strict\";", "");
      }
      return true;
    });
  }
}

// eslint-disable-next-line
function getBaseConfig(output) {
  return {
    entry: "./src/index/qt.ts",
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
      new RemoveUseStrictPlugin(output),
    ],
    output: {
      path: path.resolve(__dirname, "dist/qt/org/mozilla/Glean"),
      filename: output,
      libraryTarget: "var",
      library: "Glean",
    }
  };
}

const productionConfig = {
  ...getBaseConfig("glean.lib.js"),
  mode: "production",
  optimization: {
    usedExports: true,
    providedExports: true,
    sideEffects: true,
  },
};

const developmentConfig = {
  ...getBaseConfig("glean.dev.js"),
  mode: "development",
  devtool: false
};

export default [
  productionConfig,
  developmentConfig
];
