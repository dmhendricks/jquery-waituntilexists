import { describe, it, expect } from 'vitest';
import $ from 'jquery';

// Pins down how jQuery behaves differently across the supported matrix, so
// changes in that behaviour surface here rather than as confusing failures
// elsewhere.
//
// Two non-obvious facts are captured below:
//
//   1. jQuery 4 moved the DOM-less Node entry point to `jquery/factory`, and
//      exports the factory as a NAMED export. The intuitive
//      `import factory from 'jquery/factory'` yields an object, not a
//      callable, and fails at runtime.
//
//   2. That subpath does not exist in jQuery 3.x at all, and a *static*
//      import of it fails at Vite transform time — before any runtime guard
//      can run. So `it.skipIf` alone is not enough; the specifier is
//      assembled at runtime to defer resolution past static analysis.
const major = parseInt($.fn.jquery, 10);
const isJQuery4Plus = major >= 4;

describe(`jQuery version compatibility (jQuery ${$.fn.jquery})`, () => {
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
