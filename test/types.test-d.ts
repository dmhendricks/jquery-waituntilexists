/**
 * Type-level tests. Not run by Vitest — checked by `npm run test:types`,
 * which runs `tsc --noEmit` over this file.
 *
 * Two mechanisms:
 *   - plain assignments verify inferred types are what we expect;
 *   - `@ts-expect-error` verifies misuse is REJECTED. That line fails
 *     compilation if the error stops occurring, which is what catches drift.
 */

import type { WaitOptions, WaitHandler, WaitHandle, WaitTimeoutError } from '../types/index.js';
import { register } from '../types/index.js';

declare const $: JQueryStatic;

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------

// Returns the same type it was given, so it can be chained.
const registered: JQueryStatic = register($);
void registered;

// ---------------------------------------------------------------------------
// Static form — Promise
// ---------------------------------------------------------------------------

async function promiseForm() {
    // Resolves a jQuery collection, not a bare Element.
    const $el: JQuery<HTMLElement> = await $.waitUntilExists('#thing');
    void $el;

    // Options-only overload.
    const $withOpts: JQuery<HTMLElement> = await $.waitUntilExists('#thing', {
        timeout: 5000,
        once: true,
        attributes: false,
        pollInterval: 250,
        container: document,
    });
    void $withOpts;
}
void promiseForm;

// The handle is awaitable AND stoppable.
const handle: WaitHandle<JQuery<HTMLElement>> = $.waitUntilExists('#thing');
handle.stop();
void handle.promise;
void handle.then((c) => c.length);
void handle.catch(() => undefined);
void handle.finally(() => undefined);

// ---------------------------------------------------------------------------
// Static form — callback
// ---------------------------------------------------------------------------

$.waitUntilExists('#thing', function (el) {
    // `this` is the element, and it is also passed as the first argument.
    const fromThis: Element = this;
    const fromArg: Element = el;
    void fromThis;
    void fromArg;
});

$.waitUntilExists('#thing', () => undefined, { timeout: 100 });

// stop() by selector returns a count.
const stopped: number = $.waitUntilExists.stop('#thing');
void stopped;

// ---------------------------------------------------------------------------
// Chained form
// ---------------------------------------------------------------------------

// Returns the collection for chaining.
const chained: JQuery<HTMLElement> = $('#thing').waitUntilExists(() => undefined);
void chained;

// The legacy 'remove' alias is accepted.
void $('#thing').waitUntilExists('remove');

// ---------------------------------------------------------------------------
// Standalone types are exported and usable
// ---------------------------------------------------------------------------

const options: WaitOptions = {
    once: false,
    timeout: 1000,
    attributes: true,
    pollInterval: 0,
    container: document.body,
    onTimeout: () => undefined,
};
void options;

const handler: WaitHandler = function (el) {
    void this;
    void el;
};
void handler;

declare const timeoutError: WaitTimeoutError;
const errName: 'WaitTimeoutError' = timeoutError.name;
const errSelector: string = timeoutError.selector;
const errTimeout: number = timeoutError.timeout;
void errName;
void errSelector;
void errTimeout;

// ---------------------------------------------------------------------------
// Misuse must be rejected. Each @ts-expect-error fails the build if the
// error stops occurring — this is the actual drift guard.
// ---------------------------------------------------------------------------

// @ts-expect-error - selector is required
$.waitUntilExists();

// @ts-expect-error - selector must be a string
$.waitUntilExists(123);

// @ts-expect-error - unknown option
$.waitUntilExists('#thing', { nope: true });

// @ts-expect-error - timeout must be a number
$.waitUntilExists('#thing', { timeout: '5s' });

// @ts-expect-error - container must be a Document or Element
$.waitUntilExists('#thing', { container: 'body' });

// @ts-expect-error - stop() takes a selector
$.waitUntilExists.stop();

// @ts-expect-error - the chained form requires a handler or 'remove'
$('#thing').waitUntilExists(42);

// @ts-expect-error - only 'remove' is a valid string argument
$('#thing').waitUntilExists('destroy');

// @ts-expect-error - handles resolve a collection, not an Element
const wrongType: Promise<Element> = $.waitUntilExists('#thing').promise;
void wrongType;
