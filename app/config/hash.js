function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
    return value;
}
export function hashText(text) { let h1 = 0x811c9dc5, h2 = 0x9e3779b9; for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
} return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"); }
export function configHash(config) { return hashText(JSON.stringify(canonical(config))); }
//# sourceMappingURL=hash.js.map