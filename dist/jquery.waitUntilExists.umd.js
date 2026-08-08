/*!
 * jquery.waitUntilExists.js v2.0.0-dev.0
 * https://github.com/dmhendricks/jquery-waituntilexists
 * @license MIT
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.waitUntilExists = {}));
})(this, (function (exports) { 'use strict';

    // Phase 4 replaces this with the real jQuery bindings.

    function register($) {
        throw new Error('not implemented');
    }

    // Phase 3 placeholder.

    if (typeof window !== 'undefined' && window.jQuery) {
        register();
    }

    exports.register = register;

}));
