// Phase 3 placeholder.
import { register } from './jquery/plugin.js';

export { register };

if (typeof window !== 'undefined' && window.jQuery) {
    register(window.jQuery);
}
