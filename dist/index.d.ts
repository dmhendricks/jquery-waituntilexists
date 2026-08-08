/**
 * Type definitions for @dmhendricks/jquery-waituntilexists
 *
 * Hand-written rather than generated: the source is plain JS, and the public
 * surface is small enough that hand-maintained types are clearer than a build
 * step. `test/types.test-d.ts` guards against drift.
 */

/**
 * Options accepted by every form of `waitUntilExists`.
 */
export interface WaitOptions {
    /**
     * Stop after the first match.
     *
     * When `false`, the handler keeps firing for elements that appear later.
     * Has no effect on the Promise form, which resolves exactly once.
     *
     * @default true
     */
    once?: boolean;

    /**
     * Give up after this many milliseconds and reject with {@link WaitTimeoutError}.
     * `0` disables the timeout.
     *
     * @default 0
     */
    timeout?: number;

    /**
     * Subtree to search and observe. Matches outside it are ignored.
     *
     * @default document
     */
    container?: Document | Element;

    /**
     * Observe attribute changes as well as insertions.
     *
     * Required for selectors that match on attributes — `[data-ready]`,
     * `.is-loaded` — since an attribute change on an existing element is not a
     * childList mutation. Disable for hot paths that only care about insertion.
     *
     * @default true
     */
    attributes?: boolean;

    /**
     * Opt-in polling fallback, in milliseconds, for the rare cases a
     * MutationObserver cannot see (an unowned shadow root, same-document iframe
     * content). `0` disables polling.
     *
     * @default 0
     */
    pollInterval?: number;

    /**
     * Abort the watch. Rejects with a `DOMException` named `AbortError`,
     * matching platform convention.
     */
    signal?: AbortSignal;

    /**
     * Called when {@link WaitOptions.timeout} elapses. Intended for the callback
     * form, where no Promise rejection is being observed.
     */
    onTimeout?: () => void;
}

/**
 * Called once per newly matched element.
 *
 * `this` is bound to the element, per jQuery convention; the element is also
 * passed as the first argument.
 */
export type WaitHandler<TElement extends Element = HTMLElement> = (
    this: TElement,
    element: TElement,
) => void;

/**
 * Returned by `$.waitUntilExists()`.
 *
 * Both awaitable and stoppable: a bare Promise would lose `stop()`, and a bare
 * object would break `await`.
 */
export interface WaitHandle<TResult> extends PromiseLike<TResult> {
    /** Stop watching. Idempotent; safe to call after the watch has settled. */
    stop(): void;

    /** The underlying Promise, if you need a real Promise rather than a thenable. */
    promise: Promise<TResult>;

    then<TFulfilled = TResult, TRejected = never>(
        onfulfilled?: ((value: TResult) => TFulfilled | PromiseLike<TFulfilled>) | null,
        onrejected?: ((reason: unknown) => TRejected | PromiseLike<TRejected>) | null,
    ): Promise<TFulfilled | TRejected>;

    catch<TRejected = never>(
        onrejected?: ((reason: unknown) => TRejected | PromiseLike<TRejected>) | null,
    ): Promise<TResult | TRejected>;

    finally(onfinally?: (() => void) | null): Promise<TResult>;
}

/**
 * Rejection produced when {@link WaitOptions.timeout} elapses before a match.
 */
export declare class WaitTimeoutError extends Error {
    constructor(selector: string, timeout: number);
    name: 'WaitTimeoutError';
    /** The selector that never matched. */
    selector: string;
    /** The elapsed timeout, in milliseconds. */
    timeout: number;
}

/**
 * Attach `waitUntilExists` to a jQuery instance.
 *
 * Prefer this over the side-effect import when using a bundler: relying on the
 * global is ambiguous if more than one copy of jQuery is loaded.
 *
 * @param $ The jQuery instance to extend.
 * @returns The same instance, for chaining.
 */
export declare function register<T>($: T): T;

export default register;

// ---------------------------------------------------------------------------
// jQuery interface augmentation.
//
// Declared conditionally so this package does not force `@types/jquery` on
// consumers who do not already have it. When those types are absent, the
// interfaces below simply merge into nothing and the standalone exports above
// remain usable.
// ---------------------------------------------------------------------------

declare global {
    interface JQuery<TElement = HTMLElement> {
        /**
         * Legacy chained form.
         *
         * Invokes `handler` for each element **already** in the collection.
         *
         * This form cannot wait for elements that do not exist yet: `$('#nope')`
         * is an empty collection, and jQuery 3 removed `.selector`, so the
         * selector string is unrecoverable here. Calling it on an empty
         * collection warns and does nothing. Use
         * {@link JQueryStatic.waitUntilExists} instead.
         *
         * @returns The original collection, for chaining.
         */
        waitUntilExists(handler: WaitHandler<TElement & Element>, options?: WaitOptions): this;

        /**
         * Legacy teardown.
         *
         * Only functional on jQuery 1.x/2.x, where `.selector` still exists. On
         * jQuery 3+ it warns and does nothing — use
         * `$.waitUntilExists.stop(selector)` or the handle's `stop()`.
         *
         * @deprecated Use `$.waitUntilExists.stop(selector)`.
         */
        waitUntilExists(remove: 'remove'): this;
    }

    interface JQueryStatic<TElement = HTMLElement> {
        waitUntilExists: {
            /**
             * Watch for elements matching `selector`.
             *
             * The primary API: the selector is passed as an argument, so it
             * survives even when nothing matches yet — the case the chained form
             * cannot support.
             *
             * @example
             * const $el = await $.waitUntilExists('#thing');
             *
             * @example
             * $.waitUntilExists('#thing', function () {
             *     console.log(this.id);
             * });
             */
            (
                selector: string,
                handler: WaitHandler<TElement & Element>,
                options?: WaitOptions,
            ): WaitHandle<JQuery<TElement>>;

            (selector: string, options?: WaitOptions): WaitHandle<JQuery<TElement>>;

            /**
             * Stop every active watcher registered for `selector`.
             *
             * The version-independent replacement for
             * `$(selector).waitUntilExists('remove')`.
             *
             * @returns How many watchers were stopped.
             */
            stop(selector: string): number;
        };
    }
}
