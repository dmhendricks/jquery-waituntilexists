/**
 * Shared MutationObserver registry.
 *
 * One observer per (root, options) combination serves every watcher registered
 * against it, rather than one observer per watcher. Observers are created lazily
 * on first subscribe and disconnected as soon as their last subscriber leaves,
 * so an idle library costs nothing.
 *
 * This module must stay jQuery-free — enforced by eslint.config.js.
 */

/**
 * Active observer entries, keyed by root node.
 *
 * A single root can need more than one observer: watchers that want attribute
 * notifications and watchers that do not cannot share one, because
 * MutationObserver options are fixed per `observe()` call. Each root therefore
 * maps to a small list of entries, one per distinct option set.
 *
 * @type {Map<Node, Array<{ attributes: boolean, observer: MutationObserver, subscribers: Set<Function> }>>}
 */
const registry = new Map();

/**
 * Subscribe to DOM mutations under `root`.
 *
 * @param {Node} root Node to observe.
 * @param {boolean} attributes Whether attribute changes should notify.
 * @param {Function} callback Invoked (with no arguments) after each mutation batch.
 * @returns {Function} Unsubscribe function. Idempotent.
 */
export function subscribe(root, attributes, callback) {
    let entries = registry.get(root);
    if (!entries) {
        entries = [];
        registry.set(root, entries);
    }

    let entry = entries.find((candidate) => candidate.attributes === attributes);

    if (!entry) {
        const subscribers = new Set();

        // Snapshot before iterating: a callback may unsubscribe itself (or another
        // watcher) mid-batch, and mutating a Set during iteration would skip entries.
        const observer = new MutationObserver(() => {
            for (const subscriber of Array.from(subscribers)) {
                subscriber();
            }
        });

        entry = { attributes, observer, subscribers };
        entries.push(entry);

        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes,
        });
    }

    entry.subscribers.add(callback);

    let unsubscribed = false;
    return function unsubscribe() {
        if (unsubscribed) return;
        unsubscribed = true;

        entry.subscribers.delete(callback);
        if (entry.subscribers.size > 0) return;

        // Last subscriber for this option set — tear the observer down.
        entry.observer.disconnect();

        const remaining = registry.get(root);
        if (!remaining) return;

        const index = remaining.indexOf(entry);
        if (index !== -1) remaining.splice(index, 1);
        if (remaining.length === 0) registry.delete(root);
    };
}

/**
 * Number of live observers. Test-only helper for leak detection.
 *
 * @returns {number}
 */
export function activeObserverCount() {
    let count = 0;
    for (const entries of registry.values()) {
        count += entries.length;
    }
    return count;
}
