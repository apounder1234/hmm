// @ts-nocheck
// SUNPATHS organised source. Related prototype modules were consolidated here.
// -----------------------------------------------------------------------------
// Deterministic seeded random streams
// -----------------------------------------------------------------------------
function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^ h >>> 16) >>> 0; };
}
function makeStream(seed) { const f = xmur3(seed); return { state: [f(), f(), f(), f()], calls: 0 }; }
export function createRandomState(seed) {
    return { seed, streams: { weather: makeStream(`${seed}::weather`), conditions: makeStream(`${seed}::conditions`), market: makeStream(`${seed}::market`), ai: makeStream(`${seed}::ai`), simulation: makeStream(`${seed}::simulation`) } };
}
function rotl(x, k) { return ((x << k) | (x >>> (32 - k))) >>> 0; }
export function nextUint32(stream) {
    const s = stream.state;
    const result = rotl(Math.imul(s[1], 5) >>> 0, 7);
    const out = Math.imul(result, 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] = (s[2] ^ s[0]) >>> 0;
    s[3] = (s[3] ^ s[1]) >>> 0;
    s[1] = (s[1] ^ s[2]) >>> 0;
    s[0] = (s[0] ^ s[3]) >>> 0;
    s[2] = (s[2] ^ t) >>> 0;
    s[3] = rotl(s[3], 11);
    stream.calls++;
    return out;
}
export function randomInt(stream, maxExclusive) {
    if (maxExclusive <= 0)
        throw new Error("maxExclusive must be positive");
    return nextUint32(stream) % maxExclusive;
}
export function shuffle(items, stream) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = randomInt(stream, i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
export function pick(items, stream) {
    if (items.length === 0)
        throw new Error("Cannot pick from empty array");
    return items[randomInt(stream, items.length)];
}

