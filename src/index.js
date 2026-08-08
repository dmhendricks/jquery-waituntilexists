import { register } from './jquery/plugin.js';

export { register };
export { WaitTimeoutError } from './core/errors.js';

/**
 * Auto-register against a global jQuery when one is present.
 *
 * This is what makes the UMD build work as a plain `<script>` drop-in, and what
 * makes `import '@dmhendricks/jquery-waituntilexists'` behave like a classic
 * plugin. Bundler users with multiple jQuery copies should call `register($)`
 * explicitly instead of relying on this.
 */
const globalJQuery =
    (typeof window !== 'undefined' && (window.jQuery || window.$)) ||
    (typeof globalThis !== 'undefined' && (globalThis.jQuery || globalThis.$)) ||
    null;

if (globalJQuery && globalJQuery.fn) {
    register(globalJQuery);
}

export default register;
