import { describe, it, expect } from 'vitest';
import $ from 'jquery';

// Spike: jQuery 4 moved the no-DOM Node entry point to jquery/factory.
// Confirm what actually happens under jsdom with each import style,
// so test/setup.js in Phase 5 uses the correct one.
//
// The factory subpath does NOT exist in jQuery 3.x, and a static import
// of it fails at transform time (not runtime), so it cannot be guarded
// by a plain `it.skipIf`. The specifier is built at runtime to defer
// resolution past Vite's static analysis.
const major = parseInt($.fn.jquery, 10);
const isJQuery4Plus = major >= 4;

describe('spike: jQuery 4 import path under jsdom', () => {
    it('plain "jquery" import attaches to the ambient jsdom window/document', () => {
        expect(typeof $).toBe('function');
        expect(typeof $.fn.jquery).toBe('string');

        // Does it operate on jsdom's global document without an explicit window?
        const div = document.createElement('div');
        div.id = 'probe';
        document.body.appendChild(div);
        expect($('#probe').length).toBe(1);
    });

    it.skipIf(!isJQuery4Plus)(
        'jquery/factory exposes jQueryFactory as a NAMED export, not default',
        async () => {
            const specifier = ['jquery', 'factory'].join('/');
            const factoryModule = await import(/* @vite-ignore */ specifier);

            // Gotcha: `default` is an object wrapping the factory, so
            // `import factory from 'jquery/factory'` does NOT give you a callable.
            expect(typeof factoryModule.default).toBe('object');
            expect(typeof factoryModule.jQueryFactory).toBe('function');

            const $factory = factoryModule.jQueryFactory(window);
            expect(typeof $factory).toBe('function');
            expect($factory.fn.jquery.startsWith('4.')).toBe(true);
        },
    );

    it.skipIf(isJQuery4Plus)('jquery/factory does not exist on jQuery 3.x', async () => {
        const specifier = ['jquery', 'factory'].join('/');
        await expect(import(/* @vite-ignore */ specifier)).rejects.toThrow();
    });
});
