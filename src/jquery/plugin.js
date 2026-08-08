// Phase 4 replaces this with the real jQuery bindings.
import { watch } from '../core/watcher.js';

export function register($) {
    void $;
    void watch;
    throw new Error('not implemented');
}
