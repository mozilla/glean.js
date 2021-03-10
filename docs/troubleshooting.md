# Troubleshooting

## "Cannot find module '@mozilla/glean'"

Glean.js does not have a [`main`](https://nodejs.org/api/packages.html#packages_main_entry_point_export) package entry point. Instead it relies on a series of entry points depending on the platform you are targeting.

In order to import Glean use `import Glean from '@mozilla/glean/<your-platform>`.

> **Note**: Currently, the only supported platform is `webext`. Therefore the only valid import is `@mozilla/glean/webext`.

## "Module not found: Error: Can't resolve '@mozilla/glean/webext' in '...'"

Glean.js relies on Node.js' [subpath exports](https://nodejs.org/api/packages.html#packages_subpath_exports) feature to define multiple package entry points.

Please make sure that you are using a supported Node.js runtime (>= v12.7.0) and also make sure
the tools you are using support this Node.js feature.

> **Note**: If using Webpack, make sure you have a version >= 5.0.0 (see v5.0.0 [release notes](https://webpack.js.org/blog/2020-10-10-webpack-5-release/#major-changes-new-nodejs-ecosystem-features) for details).
