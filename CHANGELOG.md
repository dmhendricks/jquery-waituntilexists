# Changelog

## 2.0.0

Complete rewrite. v1 was broken on every jQuery released since 2016.

### Breaking

- **Requires jQuery 3.0+.** v1 read `this.selector`, removed in jQuery 3.0, so watching for a not-yet-existing element silently did nothing.
- **`$.waitUntilExists(selector, handler)` is the primary API.** The selector must be passed as an argument. The chained `$(sel).waitUntilExists(handler)` still runs the handler for elements already in the DOM, but cannot wait for future ones — it warns instead of failing silently.
- **`$(sel).waitUntilExists('remove')` is deprecated.** It only functions on jQuery 1.x/2.x, where `.selector` still exists. Use `$.waitUntilExists.stop(selector)` or the handle's `.stop()`.
- **Distributed files moved to `dist/`.** Unversioned CDN URLs now resolve to v2 and will 404 on the old path. Pin to `@1` to stay on v1.
- **The `once` default flipped.** v1 kept firing for every new match unless you passed `shouldRunHandlerOnce = true`; v2 stops after the first match unless you pass `{ once: false }`.
- **The `waitUntilExists.found` marker on element `.data()` is gone.** Watchers track seen elements internally, so the marker no longer leaks between watchers on the same element.
- **A console warning is emitted when no jQuery is found to register against.** Previously silent.

### Added

- Promise support: `await $.waitUntilExists('#thing')` resolves a jQuery collection.
- Options: `once`, `timeout`, `container`, `attributes`, `pollInterval`, `signal`, `onTimeout`.
- `AbortController` support, rejecting with a `DOMException` named `AbortError`.
- `WaitTimeoutError`, carrying `selector` and `timeout`.
- `register($)` for explicit binding under a bundler.
- `$.waitUntilExists.stop(selector)`.
- TypeScript definitions.
- ESM, CJS, and UMD builds.

### Changed

- Uses `MutationObserver` instead of 500ms polling, so matches fire immediately. One shared observer serves all watchers and disconnects when the last one stops.
- Attribute changes are observed by default, so selectors like `[data-ready]` work.
- Polling remains available via `pollInterval` for cases a `MutationObserver` cannot see.
- A throwing handler no longer affects other watchers.

## 1.0.0

Initial release.
