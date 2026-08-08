import { register } from './jquery/plugin.js';

export { register };
export { WaitTimeoutError } from './core/errors.js';

/**
 * Auto-register against a global jQuery when one is present.
 *
 * This is what makes the UMD build work as a plain `<script>` drop-in, and what
 * makes `import '@dmhendricks/jquery-waituntilexists'` behave like a classic
 * plugin.
 *
 * It only works when jQuery is actually global. Bundlers frequently keep jQuery
 * module-scoped and never assign `window.jQuery` — webpack does exactly this in
 * production — so there is nothing here to attach to. Warn rather than fail
 * silently, because a plugin that quietly never registers is the hardest kind of
 * bug to track down.
 */
const globalJQuery =
    (typeof window !== 'undefined' && (window.jQuery || window.$)) ||
    (typeof globalThis !== 'undefined' && (globalThis.jQuery || globalThis.$)) ||
    null;

if (globalJQuery && globalJQuery.fn) {
    register(globalJQuery);
} else if (typeof console !== 'undefined' && console.warn) {
    console.warn(
        'waitUntilExists: no global jQuery found, so nothing was registered. ' +
            'If you are using a bundler, import and call register() with your own ' +
            "jQuery instance:\n\n  import $ from 'jquery';\n" +
            "  import { register } from '@dmhendricks/jquery-waituntilexists';\n" +
            '  register($);',
    );
}

export default register;
