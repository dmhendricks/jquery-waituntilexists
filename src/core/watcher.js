import { subscribe } from './observer.js';
import { WaitTimeoutError, createAbortError } from './errors.js';

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
function warn(message) {
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
export function watch(selector, handler, options = {}) {
    if (typeof selector !== 'string' || selector.trim() === '') {
        throw new TypeError('waitUntilExists: a non-empty selector string is required');
    }

    const config = { ...DEFAULTS, ...options };
    const root = config.container || (typeof document !== 'undefined' ? document : null);

    if (!root) {
        throw new Error('waitUntilExists: no document available to observe');
    }

    if (config.once === false && !handler) {
        warn('`once: false` has no effect without a handler — a Promise resolves only once.');
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
