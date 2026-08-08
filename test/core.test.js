import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { watch } from '../src/core/watcher.js';
import { activeObserverCount } from '../src/core/observer.js';
import { WaitTimeoutError } from '../src/core/errors.js';

/** Let a MutationObserver batch flush. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function append(html, parent = document.body) {
    const el = document.createElement('div');
    el.innerHTML = html;
    const node = el.firstElementChild;
    parent.appendChild(node);
    return node;
}

describe('core: watch()', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('matching', () => {
        it('resolves immediately for an element already in the DOM', async () => {
            const existing = append('<div id="here"></div>');
            const { promise } = watch('#here');
            await expect(promise).resolves.toBe(existing);
        });

        it('resolves when the element appears later', async () => {
            const { promise } = watch('#later');
            let resolved = false;
            promise.then(() => {
                resolved = true;
            });

            await tick();
            expect(resolved).toBe(false);

            const el = append('<div id="later"></div>');
            await expect(promise).resolves.toBe(el);
        });

        it('finds elements added deep in a subtree', async () => {
            const host = append('<div id="host"></div>');
            const { promise } = watch('#deep');

            const mid = document.createElement('div');
            const deep = document.createElement('span');
            deep.id = 'deep';
            mid.appendChild(deep);
            host.appendChild(mid);

            await expect(promise).resolves.toBe(deep);
        });

        it('invokes the handler with the element as `this` and as an argument', async () => {
            const seen = [];
            const { promise } = watch('#cb', function (el) {
                seen.push({ self: this, arg: el });
            });

            const el = append('<div id="cb"></div>');
            await promise;

            expect(seen).toHaveLength(1);
            expect(seen[0].self).toBe(el);
            expect(seen[0].arg).toBe(el);
        });

        it('rejects an empty or non-string selector', () => {
            expect(() => watch('')).toThrow(TypeError);
            expect(() => watch('   ')).toThrow(TypeError);
            expect(() => watch(null)).toThrow(TypeError);
        });

        it('rejects rather than hangs on an invalid selector', async () => {
            const { promise } = watch('###nope');
            await expect(promise).rejects.toThrow();
        });
    });

    describe('once', () => {
        it('stops after the first match by default', async () => {
            const handler = vi.fn();
            watch('.multi', handler);

            append('<div class="multi"></div>');
            await tick();
            append('<div class="multi"></div>');
            await tick();

            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('keeps firing for later elements when once is false', async () => {
            const handler = vi.fn();
            const watcher = watch('.multi', handler, { once: false });

            append('<div class="multi"></div>');
            await tick();
            append('<div class="multi"></div>');
            await tick();

            expect(handler).toHaveBeenCalledTimes(2);
            watcher.stop();
        });

        it('never notifies the same element twice', async () => {
            const handler = vi.fn();
            const watcher = watch('.dupe', handler, { once: false });

            const el = append('<div class="dupe"></div>');
            await tick();

            // Trigger more mutation batches without adding new matches.
            append('<div class="unrelated"></div>');
            await tick();
            el.setAttribute('data-x', '1');
            await tick();

            expect(handler).toHaveBeenCalledTimes(1);
            watcher.stop();
        });
    });

    describe('attributes', () => {
        it('matches an element that only becomes matching via attribute change', async () => {
            const el = append('<div id="attr"></div>');
            const { promise } = watch('#attr[data-ready]');

            await tick();
            el.setAttribute('data-ready', 'true');

            await expect(promise).resolves.toBe(el);
        });

        it('does not match on attribute change when attributes is false', async () => {
            const el = append('<div id="attr2"></div>');
            const handler = vi.fn();
            const watcher = watch('#attr2[data-ready]', handler, { attributes: false });

            await tick();
            el.setAttribute('data-ready', 'true');
            await tick();

            expect(handler).not.toHaveBeenCalled();
            watcher.stop();
        });
    });

    describe('container scoping', () => {
        it('ignores matches outside the container', async () => {
            const inside = append('<div id="scope-host"></div>');
            const handler = vi.fn();
            const watcher = watch('.scoped', handler, { container: inside, once: false });

            append('<div class="scoped"></div>'); // outside
            await tick();
            expect(handler).not.toHaveBeenCalled();

            append('<div class="scoped"></div>', inside); // inside
            await tick();
            expect(handler).toHaveBeenCalledTimes(1);

            watcher.stop();
        });
    });

    describe('timeout', () => {
        it('rejects with WaitTimeoutError', async () => {
            const { promise } = watch('#never', undefined, { timeout: 20 });
            await expect(promise).rejects.toBeInstanceOf(WaitTimeoutError);
        });

        it('exposes selector and timeout on the error', async () => {
            const { promise } = watch('#never', undefined, { timeout: 20 });
            const err = await promise.catch((e) => e);
            expect(err.name).toBe('WaitTimeoutError');
            expect(err.selector).toBe('#never');
            expect(err.timeout).toBe(20);
        });

        it('calls onTimeout in the callback form', async () => {
            const onTimeout = vi.fn();
            watch('#never', vi.fn(), { timeout: 20, onTimeout });
            await new Promise((r) => setTimeout(r, 50));
            expect(onTimeout).toHaveBeenCalledTimes(1);
        });

        it('does not fire once the element is found', async () => {
            const onTimeout = vi.fn();
            const { promise } = watch('#quick', undefined, { timeout: 100, onTimeout });
            append('<div id="quick"></div>');
            await promise;
            await new Promise((r) => setTimeout(r, 150));
            expect(onTimeout).not.toHaveBeenCalled();
        });
    });

    describe('abort', () => {
        it('rejects with an AbortError', async () => {
            const controller = new AbortController();
            const { promise } = watch('#never', undefined, { signal: controller.signal });
            controller.abort();
            const err = await promise.catch((e) => e);
            expect(err.name).toBe('AbortError');
        });

        it('rejects immediately if the signal is already aborted', async () => {
            const controller = new AbortController();
            controller.abort();
            const { promise } = watch('#never', undefined, { signal: controller.signal });
            const err = await promise.catch((e) => e);
            expect(err.name).toBe('AbortError');
        });

        it('stops notifying after abort', async () => {
            const controller = new AbortController();
            const handler = vi.fn();
            watch('.aborted', handler, { signal: controller.signal, once: false });

            controller.abort();
            append('<div class="aborted"></div>');
            await tick();

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('stop()', () => {
        it('prevents further notifications', async () => {
            const handler = vi.fn();
            const watcher = watch('.stopped', handler, { once: false });

            watcher.stop();
            append('<div class="stopped"></div>');
            await tick();

            expect(handler).not.toHaveBeenCalled();
        });

        it('is idempotent', () => {
            const watcher = watch('#never');
            expect(() => {
                watcher.stop();
                watcher.stop();
            }).not.toThrow();
        });
    });

    describe('handler errors', () => {
        it('does not stop sibling watchers when a handler throws', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const good = vi.fn();

            watch('.shared', () => {
                throw new Error('boom');
            });
            watch('.shared', good);

            append('<div class="shared"></div>');
            await tick();

            expect(good).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('keeps a once:false watcher alive after a throwing handler', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const handler = vi.fn(() => {
                throw new Error('boom');
            });
            const watcher = watch('.throwing', handler, { once: false });

            append('<div class="throwing"></div>');
            await tick();
            append('<div class="throwing"></div>');
            await tick();

            expect(handler).toHaveBeenCalledTimes(2);
            errorSpy.mockRestore();
            watcher.stop();
        });
    });

    describe('observer lifecycle', () => {
        it('shares one observer across watchers with the same options', async () => {
            const before = activeObserverCount();
            const a = watch('#a');
            const b = watch('#b');

            expect(activeObserverCount()).toBe(before + 1);

            a.stop();
            b.stop();
            expect(activeObserverCount()).toBe(before);
        });

        it('uses separate observers for different attribute options', () => {
            const before = activeObserverCount();
            const a = watch('#a', undefined, { attributes: true });
            const b = watch('#b', undefined, { attributes: false });

            expect(activeObserverCount()).toBe(before + 2);

            a.stop();
            b.stop();
            expect(activeObserverCount()).toBe(before);
        });

        it('disconnects the observer when the last watcher resolves', async () => {
            const before = activeObserverCount();
            const { promise } = watch('#auto');
            expect(activeObserverCount()).toBe(before + 1);

            append('<div id="auto"></div>');
            await promise;

            expect(activeObserverCount()).toBe(before);
        });

        it('does not leak an observer on timeout', async () => {
            const before = activeObserverCount();
            const { promise } = watch('#never', undefined, { timeout: 20 });
            await promise.catch(() => {});
            expect(activeObserverCount()).toBe(before);
        });

        it('creates no observer when the element already exists', async () => {
            append('<div id="instant"></div>');
            const before = activeObserverCount();
            const { promise } = watch('#instant');
            await promise;
            expect(activeObserverCount()).toBe(before);
        });
    });

    describe('polling fallback', () => {
        it('finds elements via polling when enabled', async () => {
            const handler = vi.fn();
            const watcher = watch('#polled', handler, { pollInterval: 10 });

            // Bypass MutationObserver entirely: build the node detached, then
            // graft it in without the observer's root seeing a childList change.
            const detached = document.createElement('div');
            document.body.appendChild(detached);
            await tick();
            handler.mockClear();

            detached.innerHTML = '<span id="polled"></span>';
            await new Promise((r) => setTimeout(r, 40));

            expect(handler).toHaveBeenCalled();
            watcher.stop();
        });

        it('clears the poll interval on stop', async () => {
            const handler = vi.fn();
            const watcher = watch('#nothing', handler, { pollInterval: 5 });
            watcher.stop();
            await new Promise((r) => setTimeout(r, 30));
            expect(handler).not.toHaveBeenCalled();
        });
    });
});
