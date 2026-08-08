import { watch } from '../core/watcher.js';

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
export function register($) {
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
