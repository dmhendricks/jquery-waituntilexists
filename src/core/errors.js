/**
 * Thrown (as a Promise rejection) when a watcher's `timeout` elapses before
 * the selector matches anything.
 */
export class WaitTimeoutError extends Error {
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
export function createAbortError(selector) {
    const message = `waitUntilExists: watch for "${selector}" was aborted`;

    // DOMException is not constructible in every environment this may run in.
    if (typeof DOMException === 'function') {
        return new DOMException(message, 'AbortError');
    }

    const err = new Error(message);
    err.name = 'AbortError';
    return err;
}
