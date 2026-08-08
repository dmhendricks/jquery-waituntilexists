import { describe, it, expect } from 'vitest';

// Spike: jQuery 4 moved the no-DOM Node entry point to jquery/factory.
// Confirm what actually happens under jsdom with each import style,
// so test/setup.js in Phase 5 uses the correct one. Throwaway.
describe('spike: jQuery 4 import path under jsdom', () => {
    it('plain "jquery" import attaches to the ambient jsdom window/document', async () => {
        const { default: $ } = await import('jquery');
        expect(typeof $).toBe('function');
        expect(typeof $.fn.jquery).toBe('string');
        expect($.fn.jquery.startsWith('4.')).toBe(true);

        // Does it operate on jsdom's global document without an explicit window?
        const div = document.createElement('div');
        div.id = 'probe';
        document.body.appendChild(div);
        expect($('#probe').length).toBe(1);
    });

    it('jquery/factory exposes jQueryFactory as a NAMED export, not default', async () => {
        const factoryModule = await import('jquery/factory');

        // Gotcha: `default` is an object wrapping the factory, so
        // `import factory from 'jquery/factory'` does NOT give you a callable.
        expect(typeof factoryModule.default).toBe('object');
        expect(typeof factoryModule.jQueryFactory).toBe('function');

        const $ = factoryModule.jQueryFactory(window);
        expect(typeof $).toBe('function');
        expect($.fn.jquery.startsWith('4.')).toBe(true);
        expect($('#probe').length).toBe(1); // same jsdom document from the prior test
    });
});
