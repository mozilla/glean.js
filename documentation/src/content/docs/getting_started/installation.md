---
title: Installing Glean.js
description: Installing Glean.js in your project.
---

```sh
npm i @mozilla/glean
```

The way you import Glean changes depending on your platform. Please reference the [platforms](/glean.js/getting_started/platforms) page for more details about available platforms.

## Web

Usage

```js
import Glean from '@mozilla/glean/web';
```

## Deprecated platforms

> **To use the following platforms, you need to use a version of Glean.js <= 2.0.5.**

```sh
npm i @mozilla/glean@2.0.5
```

There are two deprecated platforms that can still be used

1. Web extensions
2. Node

### Web extensions

```js
import Glean from '@mozilla/glean/webext';
```


### Node

```js
import Glean from '@mozilla/glean/node';
```
