// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type Gamut = 'srgb' | 'p3';
type V3 = [number, number, number];

const D2R = Math.PI / 180;

const M_SRGB: V3[] = [
    [4.0767416621, -3.3077115913, 0.2309699292],
    [-1.2684380046, 2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, 1.7076147010],
];
const SRGB_TO_P3: V3[] = [
    [0.8224621, 0.177538, 0],
    [0.0331941, 0.9668058, 0],
    [0.0170827, 0.0723974, 0.9105199],
];
const M_P3: V3[] = SRGB_TO_P3.map(row => [0, 1, 2].map(j => row[0] * M_SRGB[0][j] + row[1] * M_SRGB[1][j] + row[2] * M_SRGB[2][j]) as V3);
const MATS: Record<Gamut, V3[]> = { srgb: M_SRGB, p3: M_P3 };
const Y_W = [0, 1, 2].map(j => 0.2126 * M_SRGB[0][j] + 0.7152 * M_SRGB[1][j] + 0.0722 * M_SRGB[2][j]) as V3;

function lmsCubed(L: number, C: number, H: number): V3 {
    const a = C * Math.cos(H * D2R), b = C * Math.sin(H * D2R);
    const l = L + 0.3963377774 * a + 0.2158037573 * b;
    const m = L - 0.1055613458 * a - 0.0638541728 * b;
    const s = L - 0.0894841775 * a - 1.2914855480 * b;
    return [l * l * l, m * m * m, s * s * s];
}

export function oklchToLinear(L: number, C: number, H: number, gamut: Gamut = 'srgb'): V3 {
    const [l, m, s] = lmsCubed(L, C, H);
    return MATS[gamut].map(r => r[0] * l + r[1] * m + r[2] * s) as V3;
}

export function luminanceOklch(L: number, C: number, H: number): number {
    const [l, m, s] = lmsCubed(L, C, H);
    return Y_W[0] * l + Y_W[1] * m + Y_W[2] * s;
}

export function inGamut(L: number, C: number, H: number, gamut: Gamut = 'srgb', eps = 1e-4): boolean {
    return oklchToLinear(L, C, H, gamut).every(x => x >= -eps && x <= 1 + eps);
}

function minPositiveRoot(a3: number, a2: number, a1: number, a0: number): number {
    const cand: number[] = [];
    if (Math.abs(a3) < 1e-4) {
        if (Math.abs(a2) < 1e-12) {
            if (Math.abs(a1) > 1e-12) cand.push(-a0 / a1);
        } else {
            const D = a1 * a1 - 4 * a2 * a0;
            if (D >= 0) { const q = Math.sqrt(D); cand.push((-a1 + q) / (2 * a2), (-a1 - q) / (2 * a2)); }
        }
    } else {
        const p = a2 / a3, q = a1 / a3, r = a0 / a3;
        const Q = (3 * q - p * p) / 9, R = (9 * p * q - 27 * r - 2 * p * p * p) / 54, s = p / 3;
        const D = Q * Q * Q + R * R;
        if (D >= 0) {
            const sq = Math.sqrt(D);
            cand.push(Math.cbrt(R + sq) + Math.cbrt(R - sq) - s);
        } else {
            const th = Math.acos(R / Math.sqrt(-Q * Q * Q)), k = 2 * Math.sqrt(-Q);
            for (let j = 0; j < 3; j++) cand.push(k * Math.cos((th + 2 * Math.PI * j) / 3) - s);
        }
    }
    let best = Infinity;
    for (let x of cand) {
        for (let i = 0; i < 3; i++) {
            const d = (3 * a3 * x + 2 * a2) * x + a1;
            if (d !== 0) x -= (((a3 * x + a2) * x + a1) * x + a0) / d;
        }
        if (x > 1e-9 && x < best) best = x;
    }
    return best;
}

export function maxChroma(L: number, H: number, gamut: Gamut = 'srgb'): number {
    if (L <= 0 || L >= 1) return 0;
    const a = Math.cos(H * D2R), b = Math.sin(H * D2R);
    const d: V3 = [0.3963377774 * a + 0.2158037573 * b, -0.1055613458 * a - 0.0638541728 * b, -0.0894841775 * a - 1.2914855480 * b];
    const L2 = L * L, L3 = L2 * L;
    let best = 0.5;
    for (const row of MATS[gamut]) {
        const a0 = L3 * (row[0] + row[1] + row[2]);
        const a1 = 3 * L2 * (row[0] * d[0] + row[1] * d[1] + row[2] * d[2]);
        const a2 = 3 * L * (row[0] * d[0] * d[0] + row[1] * d[1] * d[1] + row[2] * d[2] * d[2]);
        const a3 = row[0] * d[0] ** 3 + row[1] * d[1] ** 3 + row[2] * d[2] ** 3;
        const r0 = minPositiveRoot(a3, a2, a1, a0);
        const r1 = minPositiveRoot(a3, a2, a1, a0 - 1);
        if (r0 < best) best = r0;
        if (r1 < best) best = r1;
    }
    return best;
}

export const wcagRatio = (y1: number, y2: number): number => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
