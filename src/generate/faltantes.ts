// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface FaltantesOpciones {
    scope?: boolean;
    vocabulario?: ReadonlySet<string>;
}

const desescapar = (s: string) => s.replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1');

export function clasesDefinidas(css: string): Set<string> {
    const nombre = /(?<![0-9])\.((?:\\[0-9a-fA-F]{1,6} ?|\\[^0-9a-fA-F\s]|[A-Za-z0-9_-])+)/g;
    return new Set([...css.matchAll(nombre)].map((m) => desescapar(m[1])));
}

export function faltantes(html: string, css: string | ReadonlySet<string>, { scope = false, vocabulario }: FaltantesOpciones = {}): string[] {
    const definidas = typeof css === 'string' ? clasesDefinidas(css) : css;
    const out: string[] = [];
    for (const m of html.matchAll(/class="([^"{]*)"/g)) {
        const tokens = m[1].split(/\s+/).filter(Boolean);
        if (scope && !tokens.includes('ts')) continue;
        for (const token of tokens) {
            const base = token.slice(token.lastIndexOf(':') + 1);
            if (scope ? token === 'ts' || (vocabulario && !vocabulario.has(base)) : !base.startsWith('ts-')) continue;
            if (!definidas.has(token)) out.push(token);
        }
    }
    return out;
}
