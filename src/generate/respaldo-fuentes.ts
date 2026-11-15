// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { FontFaceDef } from '../config/taisho.types';
import { metricasDeFuente, type MetricasFuente } from './metricas-fuente';
import type { RespaldoFuente } from './emit-fonts';
import { fallo } from './resolve-extend';

const SISTEMA: Record<'sans' | 'mono', { local: string; m: MetricasFuente }> = {
    sans: { local: 'Arial', m: { unitsPerEm: 2048, ascent: 1854, descent: -434, lineGap: 67, anchoMedio: 917.32 } },
    mono: { local: 'Courier New', m: { unitsPerEm: 2048, ascent: 1705, descent: -615, lineGap: 0, anchoMedio: 1229 } },
};

const RANGOS: Record<string, string> = {
    latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
function rangoDe(req: NodeRequire, source: string, sub: string, peso: number, estilo: 'normal' | 'italic' = 'normal'): string | undefined {
    try {
        const css = fs.readFileSync(req.resolve(`${source}/${peso}${estilo === 'italic' ? '-italic' : ''}.css`), 'utf8');
        const bloque = css.split('/*').find((b) => b.includes(`-${sub}-${peso}-${estilo} */`));
        const r = bloque && /unicode-range:\s*([^;]+);/.exec(bloque)?.[1].trim();
        if (r) return r;
    } catch {
    }
    return RANGOS[sub];
}

const pct = (n: number) => `${(Math.round(n * 10000) / 100).toFixed(2)}%`;

export function respaldoDe(familia: string, m: MetricasFuente, mono: boolean, estilo?: 'italic'): RespaldoFuente {
    const sis = SISTEMA[mono ? 'mono' : 'sans'];
    const ajuste = m.anchoMedio / m.unitsPerEm / (sis.m.anchoMedio / sis.m.unitsPerEm);
    return {
        familia,
        local: estilo ? `${sis.local} Italic` : sis.local,
        sizeAdjust: pct(ajuste),
        ascent: pct(m.ascent / m.unitsPerEm / ajuste),
        descent: pct(Math.abs(m.descent) / m.unitsPerEm / ajuste),
        lineGap: pct(m.lineGap / m.unitsPerEm / ajuste),
        ...(estilo && { estilo }),
    };
}

export function respaldosDeFuentes(faces: FontFaceDef[], desde: string): RespaldoFuente[] {
    const req = createRequire(path.join(desde, 'package.json'));
    const out: RespaldoFuente[] = [];
    for (const face of faces) {
        for (const estilo of face.styles ?? ['normal']) {
            try {
                const sufijo = estilo === 'italic' ? '-italic' : '';
                const peso = [...face.weights].sort((a, b) => Math.abs(a - 400) - Math.abs(b - 400))[0];
                const subset = face.subsets[0];
                const cssPath = req.resolve(`${face.source}/${subset}-${peso}${sufijo}.css`);
                const css = fs.readFileSync(cssPath, 'utf8');
                const familia = /font-family:\s*['"]([^'"]+)['"]/.exec(css)?.[1];
                const woff = /url\(([^)]+\.woff)\)/.exec(css)?.[1];
                const rangos = face.subsets.map((sub) => rangoDe(req, face.source, sub, peso, estilo));
                if (!familia || !woff) continue;
                const m = metricasDeFuente(new Uint8Array(fs.readFileSync(path.resolve(path.dirname(cssPath), woff))));
                const respaldo = respaldoDe(familia, m, /mono/i.test(familia) || /mono/i.test(face.source), estilo === 'italic' ? 'italic' : undefined);
                if (rangos.every(Boolean)) respaldo.unicodeRange = rangos.join(', ');
                out.push(respaldo);
            } catch {
            }
        }
    }
    return out;
}

export function validarEstilosDeFuentes(faces: FontFaceDef[], desde: string): void {
    const req = createRequire(path.join(desde, 'package.json'));
    faces.forEach((face, i) => {
        if (!face.styles?.includes('italic')) return;
        for (const subset of face.subsets) {
            for (const weight of face.weights) {
                try {
                    req.resolve(`${face.source}/${subset}-${weight}-italic.css`);
                } catch {
                    throw fallo(`fontFaces[${i}].styles`, { code: 'font-italic-missing', params: { source: face.source, subset, weight } });
                }
            }
        }
    });
}
