[License: MIT](https://github.com/dmhendricks/jquery-waituntilexists/blob/main/LICENSE) · [GitHub](https://github.com/dmhendricks/jquery-waituntilexists) · [jsDelivr](https://www.jsdelivr.com/package/npm/@dmhendricks/jquery-waituntilexists)

# jquery.waitUntilExists.js

Runs a handler once a matching element is inserted into the DOM. Uses `MutationObserver`, so it reacts immediately instead of polling.

Requires jQuery 3.0+ (including jQuery 4). Original author: [Brandon Belvin](https://gist.github.com/PizzaBrandon/5709010).

## Install

```bash
npm install @dmhendricks/jquery-waituntilexists
```

```html
<script src="https://code.jquery.com/jquery-4.0.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@dmhendricks/jquery-waituntilexists@2/dist/jquery.waitUntilExists.umd.min.js"></script>
```

With a bundler, register the plugin against your own jQuery:

```js
import $ from 'jquery';
import { register } from '@dmhendricks/jquery-waituntilexists';

register($);
```

> A bare `import '@dmhendricks/jquery-waituntilexists'` only works if jQuery is a global. webpack keeps it module-scoped, so use `register($)` there. The plugin warns if it cannot find a jQuery to attach to.

## Usage

```js
// Promise
const $el = await $.waitUntilExists('#selector');

// Callback — `this` is the element
$.waitUntilExists('#selector', function () {
    console.log(this.id);
});
```

Pass the selector as an **argument**, not as `$('#selector').waitUntilExists(...)`. jQuery 3 removed `.selector`, so the chained form cannot see what it was asked to wait for. It still works for elements already in the DOM, and warns otherwise.

### Options

```js
$.waitUntilExists('#selector', handler, {
    once: true, // stop after the first match (default)
    timeout: 5000, // reject with WaitTimeoutError; 0 disables (default)
    container: document, // subtree to search and observe
    attributes: true, // observe attribute changes (default)
    pollInterval: 0, // fallback polling in ms; 0 disables (default)
    signal: controller.signal, // AbortController
    onTimeout: () => {}, // callback-form timeout notification
});
```

`attributes: true` is what makes selectors like `[data-ready]` work — an attribute change is not a DOM insertion.

### Stopping

```js
const watcher = $.waitUntilExists('#selector', handler);
watcher.stop();

// Or, by selector
$.waitUntilExists.stop('#selector');
```

### Errors

```js
try {
    await $.waitUntilExists('#selector', { timeout: 5000 });
} catch (err) {
    err.name; // 'WaitTimeoutError' or 'AbortError'
}
```

## Using jQuery 1.x or 2.x

v2 requires jQuery 3.0+. On older jQuery, pin to v1:

```html
<script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@dmhendricks/jquery-waituntilexists@1/jquery.waitUntilExists.min.js"></script>
```

```bash
npm install @dmhendricks/jquery-waituntilexists@1
```

v1 uses the chained form and 500ms polling:

```js
// Run every time a match appears
$('#selector').waitUntilExists(function () {
    console.log($(this).attr('id'));
});

// Run only once
$('#selector').waitUntilExists(handler, true);

// Stop watching
$('#selector').waitUntilExists('remove');
```

v1 is unmaintained and receives no fixes. It works on jQuery 1.x and 2.x only.

## Upgrading from v1

v1 is **broken on jQuery 3+** — it read `this.selector`, which jQuery 3 removed, so watching for a not-yet-existing element silently did nothing.

```js
// v1
$('#selector').waitUntilExists(handler);
$('#selector').waitUntilExists(handler, true); // once
$('#selector').waitUntilExists('remove');

// v2
$.waitUntilExists('#selector', handler, { once: false });
$.waitUntilExists('#selector', handler);
$.waitUntilExists.stop('#selector');
```

Note the default flipped: v1 kept firing unless you passed `true`, while v2 stops after the first match unless you pass `{ once: false }`.

Unversioned CDN URLs now resolve to v2, whose files live under `dist/`. The old unversioned path will 404 — use the pinned `@1` URL above to stay on v1.

## License

[MIT](https://github.com/dmhendricks/jquery-waituntilexists/blob/main/LICENSE)
