// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { inflateSync } from 'node:zlib';

export interface MetricasFuente {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    lineGap: number;
    anchoMedio: number;
}

const FRECUENCIAS: Record<string, number> = {
    ' ': 18, e: 11.5, a: 9.5, o: 7.8, s: 6.6, n: 6.8, r: 6.4, i: 6.7, t: 6.6, l: 4.6, d: 4.6, c: 3.8, u: 3.6, m: 2.7, h: 3.1,
    p: 2.3, g: 1.5, b: 1.4, y: 1.4, f: 1.4, v: 1.0, w: 1.2, q: 0.5, k: 0.4, j: 0.3, x: 0.2, z: 0.3,
};

type Tablas = Map<string, DataView>;

function tablas(buf: Uint8Array): Tablas {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const firma = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
    const out: Tablas = new Map();
    if (firma === 'wOFF') {
        const n = dv.getUint16(12);
        for (let i = 0; i < n; i++) {
            const e = 44 + i * 20;
            const tag = String.fromCharCode(buf[e], buf[e + 1], buf[e + 2], buf[e + 3]);
            const off = dv.getUint32(e + 4), comp = dv.getUint32(e + 8), orig = dv.getUint32(e + 12);
            const datos = buf.subarray(off, off + comp);
            const crudo = comp < orig ? new Uint8Array(inflateSync(datos)) : datos;
            out.set(tag, new DataView(crudo.buffer, crudo.byteOffset, crudo.byteLength));
        }
        return out;
    }
    if (firma === 'wOF2') throw new Error('WOFF2 no soportado: se usa el .woff o el .ttf');
    const n = dv.getUint16(4);
    for (let i = 0; i < n; i++) {
        const e = 12 + i * 16;
        const tag = String.fromCharCode(buf[e], buf[e + 1], buf[e + 2], buf[e + 3]);
        out.set(tag, new DataView(buf.buffer, buf.byteOffset + dv.getUint32(e + 8), dv.getUint32(e + 12)));
    }
    return out;
}

function glifos(cmap: DataView): (cp: number) => number {
    const n = cmap.getUint16(2);
    let sub = -1;
    for (let i = 0; i < n; i++) {
        const plat = cmap.getUint16(4 + i * 8), enc = cmap.getUint16(6 + i * 8), off = cmap.getUint32(8 + i * 8);
        if (cmap.getUint16(off) === 4 && (plat === 0 || (plat === 3 && enc === 1))) { sub = off; break; }
    }
    if (sub < 0) throw new Error('la fuente no trae una cmap formato 4');
    const segX2 = cmap.getUint16(sub + 6);
    const fin = sub + 14, ini = fin + segX2 + 2, delta = ini + segX2, rango = delta + segX2;
    return (cp) => {
        for (let s = 0; s < segX2; s += 2) {
            if (cp > cmap.getUint16(fin + s)) continue;
            const a = cmap.getUint16(ini + s);
            if (cp < a) return 0;
            const d = cmap.getInt16(delta + s), r = cmap.getUint16(rango + s);
            if (r === 0) return (cp + d) & 0xffff;
            const g = cmap.getUint16(rango + s + r + (cp - a) * 2);
            return g === 0 ? 0 : (g + d) & 0xffff;
        }
        return 0;
    };
}

export function metricasDeFuente(buf: Uint8Array): MetricasFuente {
    const t = tablas(buf);
    const head = t.get('head'), hhea = t.get('hhea'), hmtx = t.get('hmtx'), cmap = t.get('cmap');
    if (!head || !hhea || !hmtx || !cmap) throw new Error('faltan tablas (head, hhea, hmtx o cmap)');
    const nMetricas = hhea.getUint16(34);
    const avance = (g: number) => hmtx.getUint16(4 * Math.min(g, nMetricas - 1));
    const glifo = glifos(cmap);
    let suma = 0, peso = 0;
    for (const [c, f] of Object.entries(FRECUENCIAS)) {
        const g = glifo(c.codePointAt(0)!);
        if (!g) continue;
        suma += avance(g) * f;
        peso += f;
    }
    return {
        unitsPerEm: head.getUint16(18),
        ascent: hhea.getInt16(4),
        descent: hhea.getInt16(6),
        lineGap: hhea.getInt16(8),
        anchoMedio: suma / peso,
    };
}
