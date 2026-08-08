import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jQuery from 'jquery';
import { register } from '../src/jquery/plugin.js';

const $ = register(jQuery);
const major = parseInt($.fn.jquery, 10);

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function append(html, parent = document.body) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const node = wrapper.firstElementChild;
    parent.appendChild(node);
    return node;
}

describe(`jQuery bindings (jQuery ${jQuery.fn.jquery})`, () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('register()', () => {
        it('attaches both the static and chained forms', () => {
            expect(typeof $.waitUntilExists).toBe('function');
            expect(typeof $.fn.waitUntilExists).toBe('function');
        });

        it('rejects a non-jQuery argument', () => {
            expect(() => register({})).toThrow(TypeError);
            expect(() => register(null)).toThrow(TypeError);
        });

        it('returns the instance for chaining', () => {
            expect(register(jQuery)).toBe(jQuery);
        });
    });

    describe('static form', () => {
        it('resolves a jQuery collection, not a bare element', async () => {
            const el = append('<div id="static"></div>');
            const $el = await $.waitUntilExists('#static');

            expect($el.jquery).toBeDefined();
            expect($el.length).toBe(1);
            expect($el[0]).toBe(el);
        });

        it('resolves for an element added later', async () => {
            const handle = $.waitUntilExists('#later');
            const el = append('<div id="later"></div>');
            const $el = await handle;
            expect($el[0]).toBe(el);
        });

        it('binds `this` to the element in the callback form', async () => {
            let seen = null;
            const handle = $.waitUntilExists('#cb', function () {
                seen = this;
            });

            const el = append('<div id="cb"></div>');
            await handle;
            expect(seen).toBe(el);
        });

        it('accepts options as the second argument', async () => {
            const handle = $.waitUntilExists('#never-opts', { timeout: 20 });
            await expect(handle).rejects.toThrow();
        });

        it('accepts handler and options together', async () => {
            const handler = vi.fn();
            const host = append('<div id="host"></div>');
            $.waitUntilExists('.scoped', handler, { container: host, once: false });

            append('<div class="scoped"></div>'); // outside container
            await tick();
            expect(handler).not.toHaveBeenCalled();

            append('<div class="scoped"></div>', host);
            await tick();
            expect(handler).toHaveBeenCalledTimes(1);

            $.waitUntilExists.stop('.scoped');
        });

        it('returns a handle that is both awaitable and stoppable', async () => {
            const handle = $.waitUntilExists('#dual');
            expect(typeof handle.stop).toBe('function');
            expect(typeof handle.then).toBe('function');

            append('<div id="dual"></div>');
            const $el = await handle;
            expect($el.length).toBe(1);
        });

        it('stop() prevents the handler from firing', async () => {
            const handler = vi.fn();
            const handle = $.waitUntilExists('#stopped', handler);

            handle.stop();
            append('<div id="stopped"></div>');
            await tick();

            expect(handler).not.toHaveBeenCalled();
        });

        it('supports .catch() on the handle', async () => {
            const onRejected = vi.fn();
            await $.waitUntilExists('#never-catch', { timeout: 20 }).catch(onRejected);
            expect(onRejected).toHaveBeenCalled();
        });
    });

    describe('$.waitUntilExists.stop()', () => {
        it('stops watchers registered for a selector', async () => {
            const handler = vi.fn();
            $.waitUntilExists('.bulk', handler, { once: false });

            const stopped = $.waitUntilExists.stop('.bulk');
            expect(stopped).toBe(1);

            append('<div class="bulk"></div>');
            await tick();
            expect(handler).not.toHaveBeenCalled();
        });

        it('returns 0 for an unknown selector', () => {
            expect($.waitUntilExists.stop('.never-registered')).toBe(0);
        });

        it('stops every watcher sharing a selector', () => {
            $.waitUntilExists('.shared-sel', vi.fn(), { once: false });
            $.waitUntilExists('.shared-sel', vi.fn(), { once: false });
            expect($.waitUntilExists.stop('.shared-sel')).toBe(2);
        });
    });

    describe('chained form', () => {
        it('invokes the handler for each element already present', () => {
            append('<div class="present"></div>');
            append('<div class="present"></div>');

            const seen = [];
            $('.present').waitUntilExists(function () {
                seen.push(this);
            });

            expect(seen).toHaveLength(2);
        });

        it('returns the collection for chaining', () => {
            append('<div class="chain"></div>');
            const $els = $('.chain');
            expect($els.waitUntilExists(vi.fn())).toBe($els);
        });

        it('warns on an empty collection instead of failing silently', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const handler = vi.fn();

            $('#does-not-exist').waitUntilExists(handler);

            expect(handler).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('empty collection'));
            warnSpy.mockRestore();
        });

        it('warns that once:false is unsupported here', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            append('<div class="once-false"></div>');

            $('.once-false').waitUntilExists(vi.fn(), { once: false });

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('once: false'));
            warnSpy.mockRestore();
        });

        it('throws on a non-function, non-"remove" argument', () => {
            append('<div class="bad-arg"></div>');
            expect(() => $('.bad-arg').waitUntilExists(42)).toThrow(TypeError);
        });

        it('does not let a throwing handler escape', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            append('<div class="throws"></div>');

            expect(() => {
                $('.throws').waitUntilExists(() => {
                    throw new Error('boom');
                });
            }).not.toThrow();

            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });

    describe("'remove' alias", () => {
        it('is accepted and returns the collection', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            append('<div class="rm"></div>');
            const $els = $('.rm');
            expect($els.waitUntilExists('remove')).toBe($els);
            warnSpy.mockRestore();
        });

        it.skipIf(major >= 3)('stops a watcher by selector when .selector exists', async () => {
            const handler = vi.fn();
            $.waitUntilExists('.legacy-rm', handler, { once: false });

            $('.legacy-rm').waitUntilExists('remove');

            append('<div class="legacy-rm"></div>');
            await tick();
            expect(handler).not.toHaveBeenCalled();
        });

        it.skipIf(major < 3)('warns on jQuery 3+ where .selector is gone', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            $('.whatever').waitUntilExists('remove');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('.selector'));
            warnSpy.mockRestore();
        });
    });

    describe('container scoping vs jQuery 4 selector-native changes', () => {
        // jQuery 4 changed how the native selector engine handles context:
        // $div.find('> *') no longer throws, and $div.find('div span') in a
        // parent context now correctly returns 0. `container` scoping uses
        // querySelectorAll directly rather than jQuery's engine, so it should
        // behave identically across the matrix — verify rather than assume.

        it('scopes to the container on every jQuery version', async () => {
            const host = append('<div id="ctx-host"></div>');
            append('<div id="ctx-outside" class="ctx"></div>');

            const handler = vi.fn();
            $.waitUntilExists('.ctx', handler, { container: host, once: false });

            await tick();
            expect(handler).not.toHaveBeenCalled();

            const inside = append('<div class="ctx"></div>', host);
            await tick();

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0]).toBe(inside);

            $.waitUntilExists.stop('.ctx');
        });

        it('handles a descendant selector inside a container', async () => {
            // The jQuery 4 change that bit `.find('div span')` in a parent
            // context. querySelectorAll matches descendants of the container,
            // so `span` inside `div` inside the container must be found.
            const host = append('<div id="desc-host"></div>');
            const handle = $.waitUntilExists('div span', { container: host });

            const mid = document.createElement('div');
            const span = document.createElement('span');
            mid.appendChild(span);
            host.appendChild(mid);

            const $el = await handle;
            expect($el[0]).toBe(span);
        });

        it('supports a child-combinator selector without throwing', async () => {
            // jQuery 4 made `.find('> *')` stop throwing. The `:scope` form is
            // the standards-compliant equivalent for querySelectorAll.
            const host = append('<div id="child-host"></div>');
            const handle = $.waitUntilExists(':scope > .direct', { container: host });

            const direct = document.createElement('div');
            direct.className = 'direct';
            host.appendChild(direct);

            const $el = await handle;
            expect($el[0]).toBe(direct);
        });

        it('does not match a grandchild for a child-combinator selector', async () => {
            const host = append('<div id="gc-host"></div>');
            const handler = vi.fn();
            $.waitUntilExists(':scope > .only-direct', handler, {
                container: host,
                once: false,
            });

            const mid = document.createElement('div');
            const deep = document.createElement('div');
            deep.className = 'only-direct';
            mid.appendChild(deep);
            host.appendChild(mid);
            await tick();

            expect(handler).not.toHaveBeenCalled();
            $.waitUntilExists.stop(':scope > .only-direct');
        });
    });

    describe('regression: the v1 jQuery 3 breakage', () => {
        it('static form works where v1 silently did nothing', async () => {
            // v1 read this.selector, which jQuery 3 removed, so watching for a
            // not-yet-existing element never fired. This is the fix.
            const handler = vi.fn();
            const handle = $.waitUntilExists('#the-bug', handler);

            await tick();
            expect(handler).not.toHaveBeenCalled();

            const el = append('<div id="the-bug"></div>');
            const $el = await handle;

            expect(handler).toHaveBeenCalledTimes(1);
            expect($el[0]).toBe(el);
        });
    });
});
