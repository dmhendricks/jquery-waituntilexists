import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Verify the BUILT bundles work, not just src/. Guards against bundling bugs:
// dropped exports, broken interop, or `process.env` leaking into browser code.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = (file) => path.join(root, 'dist', file);

describe('built bundle smoke test', () => {
    it('ESM build exposes register', async () => {
        const mod = await import(dist('jquery.waitUntilExists.esm.js'));
        expect(typeof mod.register).toBe('function');
    });

    it('CJS build loads under require()', () => {
        const require = createRequire(path.join(root, 'package.json'));
        const mod = require(dist('jquery.waitUntilExists.cjs'));
        expect(typeof mod.register).toBe('function');
    });

    it('UMD build attaches to the global object', () => {
        const code = fs.readFileSync(dist('jquery.waitUntilExists.umd.js'), 'utf8');

        // The UMD wrapper prefers globalThis, so give it an isolated one rather
        // than trying to pass a fake `window`.
        const fakeGlobal = {};
        const run = new Function(
            'globalThis',
            'exports',
            'module',
            'define',
            `${code}; return globalThis;`,
        );
        const result = run(fakeGlobal, undefined, undefined, undefined);

        expect(typeof result.waitUntilExists).toBe('object');
        expect(typeof result.waitUntilExists.register).toBe('function');
    });

    it('no bundle references process.env in executable code', () => {
        // Strip comments before checking: the source explains *why* it avoids
        // process.env, and that prose survives into unminified bundles. Only a
        // real reference would throw "process is not defined" in a browser.
        const stripComments = (code) =>
            code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

        for (const file of [
            'jquery.waitUntilExists.esm.js',
            'jquery.waitUntilExists.cjs',
            'jquery.waitUntilExists.umd.js',
            'jquery.waitUntilExists.umd.min.js',
        ]) {
            const code = stripComments(fs.readFileSync(dist(file), 'utf8'));
            expect(code, `${file} references process.env`).not.toContain('process.env');
        }
    });

    it('bundles evaluate without a `process` global', () => {
        // The real assertion behind the check above: loading the UMD build in an
        // environment with no `process` (i.e. a browser) must not throw.
        const code = fs.readFileSync(dist('jquery.waitUntilExists.umd.js'), 'utf8');
        const run = new Function(
            'globalThis',
            'process',
            'exports',
            'module',
            'define',
            `${code}; return globalThis;`,
        );
        expect(() => run({}, undefined, undefined, undefined, undefined)).not.toThrow();
    });

    it('minified build keeps the license banner', () => {
        const code = fs.readFileSync(dist('jquery.waitUntilExists.umd.min.js'), 'utf8');
        expect(code).toContain('@license MIT');
    });
});

describe('auto-registration', () => {
    it('registers against a global jQuery when one exists', () => {
        const code = fs.readFileSync(dist('jquery.waitUntilExists.umd.js'), 'utf8');
        const fakeJQuery = Object.assign(function () {}, { fn: {} });
        const fakeGlobal = { jQuery: fakeJQuery };

        new Function('globalThis', 'exports', 'module', 'define', code)(
            fakeGlobal,
            undefined,
            undefined,
            undefined,
        );

        expect(typeof fakeJQuery.waitUntilExists).toBe('function');
        expect(typeof fakeJQuery.fn.waitUntilExists).toBe('function');
    });

    it('warns rather than failing silently when no global jQuery exists', () => {
        // Bundlers frequently keep jQuery module-scoped and never set
        // window.jQuery — webpack does this in production. Auto-registration
        // cannot work there, and silence would be the worst outcome.
        const code = fs.readFileSync(dist('jquery.waitUntilExists.umd.js'), 'utf8');
        const warnings = [];
        const fakeGlobal = { console: { warn: (m) => warnings.push(m) } };

        new Function('globalThis', 'console', 'exports', 'module', 'define', code)(
            fakeGlobal,
            fakeGlobal.console,
            undefined,
            undefined,
            undefined,
        );

        expect(warnings.join('\n')).toContain('no global jQuery found');
        expect(warnings.join('\n')).toContain('register($)');
    });
});
