/*!
 * jquery.waitUntilExists.js v2.0.0
 * https://github.com/dmhendricks/jquery-waituntilexists
 * @license MIT
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.waitUntilExists = {}));
})(this, (function (exports) { 'use strict';

    /**
     * Shared MutationObserver registry.
     *
     * One observer per (root, options) combination serves every watcher registered
     * against it, rather than one observer per watcher. Observers are created lazily
     * on first subscribe and disconnected as soon as their last subscriber leaves,
     * so an idle library costs nothing.
     *
     * This module must stay jQuery-free — enforced by eslint.config.js.
     */

    /**
     * Active observer entries, keyed by root node.
     *
     * A single root can need more than one observer: watchers that want attribute
     * notifications and watchers that do not cannot share one, because
     * MutationObserver options are fixed per `observe()` call. Each root therefore
     * maps to a small list of entries, one per distinct option set.
     *
     * @type {Map<Node, Array<{ attributes: boolean, observer: MutationObserver, subscribers: Set<Function> }>>}
     */
    const registry = new Map();

    /**
     * Subscribe to DOM mutations under `root`.
     *
     * @param {Node} root Node to observe.
     * @param {boolean} attributes Whether attribute changes should notify.
     * @param {Function} callback Invoked (with no arguments) after each mutation batch.
     * @returns {Function} Unsubscribe function. Idempotent.
     */
    function subscribe(root, attributes, callback) {
        let entries = registry.get(root);
        if (!entries) {
            entries = [];
            registry.set(root, entries);
        }

        let entry = entries.find((candidate) => candidate.attributes === attributes);

        if (!entry) {
            const subscribers = new Set();

            // Snapshot before iterating: a callback may unsubscribe itself (or another
            // watcher) mid-batch, and mutating a Set during iteration would skip entries.
            const observer = new MutationObserver(() => {
                for (const subscriber of Array.from(subscribers)) {
                    subscriber();
                }
            });

            entry = { attributes, observer, subscribers };
            entries.push(entry);

            observer.observe(root, {
                childList: true,
                subtree: true,
                attributes,
            });
        }

        entry.subscribers.add(callback);

        let unsubscribed = false;
        return function unsubscribe() {
            if (unsubscribed) return;
            unsubscribed = true;

            entry.subscribers.delete(callback);
            if (entry.subscribers.size > 0) return;

            // Last subscriber for this option set — tear the observer down.
            entry.observer.disconnect();

            const remaining = registry.get(root);
            if (!remaining) return;

            const index = remaining.indexOf(entry);
            if (index !== -1) remaining.splice(index, 1);
            if (remaining.length === 0) registry.delete(root);
        };
    }

    /**
     * Thrown (as a Promise rejection) when a watcher's `timeout` elapses before
     * the selector matches anything.
     */
    class WaitTimeoutError extends Error {
        /**
         * @param {string} selector The selector that never matched.
         * @param {number} timeout The elapsed timeout, in milliseconds.
         */
        constructor(selector, timeout) {
            super(`waitUntilExists: "${selector}" did not appear within ${timeout}ms`);
            this.name = 'WaitTimeoutError';
            this.selector = selector;
            this.timeout = timeout;
        }
    }

    /**
     * Build the abort rejection. Uses a real DOMException named "AbortError" so it
     * matches platform convention for AbortController — callers can check
     * `err.name === 'AbortError'` exactly as they would for fetch().
     *
     * @param {string} selector The selector that was being watched.
     * @returns {DOMException|Error}
     */
    function createAbortError(selector) {
        const message = `waitUntilExists: watch for "${selector}" was aborted`;

        // DOMException is not constructible in every environment this may run in.
        if (typeof DOMException === 'function') {
            return new DOMException(message, 'AbortError');
        }

        const err = new Error(message);
        err.name = 'AbortError';
        return err;
    }

    /**
     * This module must stay jQuery-free — enforced by eslint.config.js.
     */

    /**
     * Emit a developer warning.
     *
     * Deliberately not gated on `process.env.NODE_ENV`: that identifier does not
     * exist in a browser unless a bundler substitutes it, and this package ships a
     * UMD build loaded directly via `<script>` from a CDN, where nothing performs
     * that substitution. A bare reference would throw "process is not defined".
     *
     * These warnings only fire on genuine API misuse, so the cost of keeping them
     * in production builds is negligible.
     */
    function warn$1(message) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(`waitUntilExists: ${message}`);
        }
    }

    /**
     * @typedef {object} WatchOptions
     * @property {boolean} [once=true] Stop after the first match. When false, the
     *   handler keeps firing for elements that appear later.
     * @property {number} [timeout=0] Give up after N ms. 0 disables the timeout.
     * @property {Node} [container=document] Subtree to search and observe.
     * @property {boolean} [attributes=true] Observe attribute changes. Needed for
     *   selectors that match on attributes, e.g. `[data-ready]`.
     * @property {number} [pollInterval=0] Opt-in polling fallback for cases a
     *   MutationObserver cannot see. 0 disables polling.
     * @property {AbortSignal} [signal] Abort the watch.
     * @property {Function} [onTimeout] Callback-form timeout notification.
     */

    /** @type {Required<Pick<WatchOptions, 'once'|'timeout'|'attributes'|'pollInterval'>>} */
    const DEFAULTS = {
        once: true,
        timeout: 0,
        attributes: true,
        pollInterval: 0,
    };

    /**
     * Watch for elements matching `selector` and invoke `handler` for each one.
     *
     * The selector is captured here, as an argument — never read back off a
     * collection. That is the whole reason v1 broke on jQuery 3: `this.selector`
     * was removed, so a selector that had not matched anything yet was
     * unrecoverable.
     *
     * @param {string} selector
     * @param {(el: Element) => void} [handler] Called once per newly matched element.
     * @param {WatchOptions} [options]
     * @returns {{ stop: Function, promise: Promise<Element> }}
     */
    function watch(selector, handler, options = {}) {
        if (typeof selector !== 'string' || selector.trim() === '') {
            throw new TypeError('waitUntilExists: a non-empty selector string is required');
        }

        const config = { ...DEFAULTS, ...options };
        const root = config.container || (typeof document !== 'undefined' ? document : null);

        if (!root) {
            throw new Error('waitUntilExists: no document available to observe');
        }

        if (config.once === false && !handler) {
            warn$1('`once: false` has no effect without a handler — a Promise resolves only once.');
        }

        // Per-watcher marker. A WeakSet keeps this private to the watcher and lets
        // elements be garbage-collected, unlike v1's `.data()` marker, which wrote
        // into the user's element data store and leaked across watchers.
        const seen = new WeakSet();

        let stopped = false;
        let unsubscribe = null;
        let timeoutId = null;
        let pollId = null;
        let settle = null;

        const promise = new Promise((resolve, reject) => {
            settle = { resolve, reject };
        });

        // A caller using the callback form may never touch `.promise`. Without this,
        // a timeout or abort rejection would surface as an unhandled rejection.
        if (handler) {
            promise.catch(() => {});
        }

        function cleanup() {
            if (stopped) return;
            stopped = true;

            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (pollId !== null) {
                clearInterval(pollId);
                pollId = null;
            }
            if (config.signal) {
                config.signal.removeEventListener('abort', onAbort);
            }
        }

        function onAbort() {
            cleanup();
            settle.reject(createAbortError(selector));
        }

        /**
         * Scan for matches and notify. Returns true if the watcher is finished.
         * @returns {boolean}
         */
        function check() {
            if (stopped) return true;

            let matches;
            try {
                matches = root.querySelectorAll(selector);
            } catch (err) {
                // Invalid selector — fail loudly rather than silently never matching.
                cleanup();
                settle.reject(err);
                return true;
            }

            let first = null;

            for (const el of matches) {
                if (seen.has(el)) continue;
                seen.add(el);

                if (!first) first = el;

                if (handler) {
                    // A throwing handler must not take down the shared observer or
                    // any sibling watcher. Report it and keep going.
                    try {
                        handler.call(el, el);
                    } catch (err) {
                        if (typeof console !== 'undefined' && console.error) {
                            console.error('waitUntilExists: handler threw', err);
                        }
                    }
                }

                if (config.once) break;
            }

            if (first && config.once) {
                cleanup();
                settle.resolve(first);
                return true;
            }

            if (first) settle.resolve(first);

            return false;
        }

        // Synchronous first check: elements already in the DOM fire immediately
        // rather than waiting for the next unrelated mutation.
        if (check()) {
            return { stop: cleanup, promise };
        }

        if (config.signal) {
            if (config.signal.aborted) {
                onAbort();
                return { stop: cleanup, promise };
            }
            config.signal.addEventListener('abort', onAbort);
        }

        unsubscribe = subscribe(root, config.attributes, check);

        if (config.pollInterval > 0) {
            pollId = setInterval(check, config.pollInterval);
        }

        if (config.timeout > 0) {
            timeoutId = setTimeout(() => {
                cleanup();

                if (config.onTimeout) {
                    try {
                        config.onTimeout();
                    } catch (err) {
                        if (typeof console !== 'undefined' && console.error) {
                            console.error('waitUntilExists: onTimeout threw', err);
                        }
                    }
                }

                settle.reject(new WaitTimeoutError(selector, config.timeout));
            }, config.timeout);
        }

        return { stop: cleanup, promise };
    }

    /**
     * jQuery bindings for the jQuery-free core.
     *
     * This layer does three things the core deliberately does not:
     *   1. wraps resolved elements in a jQuery collection,
     *   2. exposes the legacy chained form, and
     *   3. supports the deprecated `'remove'` string argument.
     */

    function warn(message) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(`waitUntilExists: ${message}`);
        }
    }

    /**
     * Active watchers keyed by selector string.
     *
     * Exists so the legacy `$(sel).waitUntilExists('remove')` teardown keeps
     * working: v1 keyed its intervals by selector, and code in the wild relies on
     * that. Entries are removed as watchers finish, so this does not grow
     * unbounded.
     *
     * @type {Map<string, Set<{ stop: Function }>>}
     */
    const bySelector = new Map();

    function trackBySelector(selector, watcher) {
        let set = bySelector.get(selector);
        if (!set) {
            set = new Set();
            bySelector.set(selector, set);
        }
        set.add(watcher);

        // Drop the entry once the watcher settles, either way.
        watcher.promise.then(
            () => untrackBySelector(selector, watcher),
            () => untrackBySelector(selector, watcher),
        );
    }

    function untrackBySelector(selector, watcher) {
        const set = bySelector.get(selector);
        if (!set) return;
        set.delete(watcher);
        if (set.size === 0) bySelector.delete(selector);
    }

    function stopBySelector(selector) {
        const set = bySelector.get(selector);
        if (!set) return 0;

        const count = set.size;
        for (const watcher of Array.from(set)) {
            watcher.stop();
            untrackBySelector(selector, watcher);
        }
        return count;
    }

    /**
     * Normalise the (handler, options) argument pair.
     *
     * Both `fn(sel, handler)` and `fn(sel, options)` are valid, as is
     * `fn(sel, handler, options)`.
     *
     * @param {Function|object} [handlerOrOptions]
     * @param {object} [maybeOptions]
     * @returns {{ handler: Function|undefined, options: object }}
     */
    function normaliseArgs(handlerOrOptions, maybeOptions) {
        if (typeof handlerOrOptions === 'function') {
            return { handler: handlerOrOptions, options: maybeOptions || {} };
        }
        return { handler: undefined, options: handlerOrOptions || maybeOptions || {} };
    }

    /**
     * Wrap a core watcher so it is both awaitable and has `.stop()`.
     *
     * Returning a bare Promise would lose `.stop()`; returning a bare object would
     * break `await`. A thenable carrying both keeps the single-return-value API
     * honest for callback users and Promise users alike.
     *
     * @param {{ stop: Function, promise: Promise<Element> }} watcher
     * @param {Function} $ The jQuery instance to wrap resolved elements with.
     * @returns {object}
     */
    function createHandle(watcher, $) {
        // Resolve a jQuery collection rather than a bare Element: `$.waitUntilExists()`
        // is jQuery-facing API, so `await` should hand back something chainable.
        const promise = watcher.promise.then((el) => $(el));

        // The caller may only ever use `.stop()`. Without this, a timeout or abort
        // rejection on the derived promise surfaces as an unhandled rejection.
        promise.catch(() => {});

        return {
            stop: watcher.stop,
            promise,
            then: (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected),
            catch: (onRejected) => promise.catch(onRejected),
            finally: (onFinally) => promise.finally(onFinally),
        };
    }

    /**
     * Attach `waitUntilExists` to a jQuery instance.
     *
     * Pass your own jQuery explicitly when using a bundler — relying on the global
     * is ambiguous if more than one copy of jQuery is present.
     *
     * @param {Function} $ jQuery instance.
     * @returns {Function} The same instance, for chaining.
     */
    function register($) {
        if (typeof $ !== 'function' || !$.fn) {
            throw new TypeError('waitUntilExists: register() requires a jQuery instance');
        }

        /**
         * Static form. This is the primary API — the selector arrives as an
         * argument, so it is still available when nothing matches yet.
         *
         * @param {string} selector
         * @param {Function|object} [handlerOrOptions]
         * @param {object} [maybeOptions]
         */
        $.waitUntilExists = function (selector, handlerOrOptions, maybeOptions) {
            const { handler, options } = normaliseArgs(handlerOrOptions, maybeOptions);
            const watcher = watch(selector, handler, options);

            // Track by selector so the legacy `$(sel).waitUntilExists('remove')`
            // can still find and stop it, matching v1's teardown semantics.
            trackBySelector(selector, watcher);

            return createHandle(watcher, $);
        };

        /**
         * Stop every active watcher registered for `selector`.
         *
         * @param {string} selector
         * @returns {number} How many watchers were stopped.
         */
        $.waitUntilExists.stop = function (selector) {
            return stopBySelector(selector);
        };

        /**
         * Chained form, kept for backwards compatibility.
         *
         * This form cannot support the main use case — waiting for something that
         * does not exist yet — because `$('#nope')` is an empty collection and
         * jQuery 3 removed `.selector`, so the string is simply gone by the time
         * this runs. Where a selector cannot be recovered, warn loudly rather than
         * failing silently the way v1 does.
         *
         * @param {Function|string} handlerOrRemove Handler, or the legacy `'remove'`.
         * @param {object} [options]
         * @returns {jQuery} The original collection, per jQuery convention.
         */
        $.fn.waitUntilExists = function (handlerOrRemove, options) {
            // Legacy teardown: `$(sel).waitUntilExists('remove')`.
            //
            // v1 keyed its intervals by selector string, which this form no longer
            // has. jQuery 1.x exposed `.selector`; jQuery 3 removed it. Where a
            // build still provides it, honour the old behaviour; otherwise say so
            // rather than pretending to have stopped something.
            if (handlerOrRemove === 'remove') {
                const selector = typeof this.selector === 'string' ? this.selector : null;

                if (selector) {
                    stopBySelector(selector);
                } else {
                    warn(
                        "'remove' on the chained form cannot identify which watcher to stop: " +
                            'jQuery 3 removed .selector. Use $.waitUntilExists.stop(selector), ' +
                            'or keep the handle returned by $.waitUntilExists() and call .stop().',
                    );
                }

                return this;
            }

            if (typeof handlerOrRemove !== 'function') {
                throw new TypeError(
                    'waitUntilExists: a handler function (or the string "remove") is required',
                );
            }

            if (this.length === 0) {
                warn(
                    'called on an empty collection, which cannot work: jQuery 3 removed ' +
                        '.selector, so the selector string is unrecoverable here. ' +
                        'Use $.waitUntilExists(selector, handler) instead.',
                );
                return this;
            }

            // The collection is non-empty, so there are real elements to act on.
            // Notify for each immediately — this is the one case v1 genuinely
            // handled, and it still works.
            //
            // `once: false` is deliberately NOT supported here. Watching for
            // *future* matches needs the selector string, which is exactly what is
            // unavailable in this form. Any guess (matching by tag name, by class,
            // by reconstructing a selector from the element) would fire on things
            // the caller never asked for. Use $.waitUntilExists() for that.
            if (options && options.once === false) {
                warn(
                    '`once: false` is not supported on the chained form — watching for ' +
                        'future matches needs the selector string, which jQuery 3 removed. ' +
                        'Use $.waitUntilExists(selector, handler, { once: false }) instead.',
                );
            }

            this.each(function () {
                try {
                    handlerOrRemove.call(this, this);
                } catch (err) {
                    if (typeof console !== 'undefined' && console.error) {
                        console.error('waitUntilExists: handler threw', err);
                    }
                }
            });

            return this;
        };

        return $;
    }

    /**
     * Auto-register against a global jQuery when one is present.
     *
     * This is what makes the UMD build work as a plain `<script>` drop-in, and what
     * makes `import '@dmhendricks/jquery-waituntilexists'` behave like a classic
     * plugin.
     *
     * It only works when jQuery is actually global. Bundlers frequently keep jQuery
     * module-scoped and never assign `window.jQuery` — webpack does exactly this in
     * production — so there is nothing here to attach to. Warn rather than fail
     * silently, because a plugin that quietly never registers is the hardest kind of
     * bug to track down.
     */
    const globalJQuery =
        (typeof window !== 'undefined' && (window.jQuery || window.$)) ||
        (typeof globalThis !== 'undefined' && (globalThis.jQuery || globalThis.$)) ||
        null;

    if (globalJQuery && globalJQuery.fn) {
        register(globalJQuery);
    } else if (typeof console !== 'undefined' && console.warn) {
        console.warn(
            'waitUntilExists: no global jQuery found, so nothing was registered. ' +
                'If you are using a bundler, import and call register() with your own ' +
                "jQuery instance:\n\n  import $ from 'jquery';\n" +
                "  import { register } from '@dmhendricks/jquery-waituntilexists';\n" +
                '  register($);',
        );
    }

    exports.WaitTimeoutError = WaitTimeoutError;
    exports.default = register;
    exports.register = register;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
