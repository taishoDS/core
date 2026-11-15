// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface Etiqueta {
    nombre: string;
    desde: number;
    hasta: number;
}

export function etiquetaEn(texto: string, i: number): Etiqueta | null {
    let j = texto.lastIndexOf('<', i);
    for (let intentos = 0; j >= 0 && intentos < 50; intentos++, j = j > 0 ? texto.lastIndexOf('<', j - 1) : -1) {
        const nombre = /^<([A-Za-z][\w.:-]*)/.exec(texto.slice(j, j + 80));
        if (!nombre || /[A-Za-z0-9_$)\]]/.test(texto[j - 1] ?? '')) continue;
        let profundidad = 0;
        let comilla = '';
        for (let k = j + nombre[0].length; k < texto.length; k++) {
            const c = texto[k];
            if (comilla) {
                if (c === '\\') k++;
                else if (c === comilla) comilla = '';
            } else if (c === '"' || c === "'" || (c === '`' && profundidad > 0)) comilla = c;
            else if (c === '{') profundidad++;
            else if (c === '}') profundidad--;
            else if (c === '>' && profundidad <= 0) {
                if (k < i) return null;
                return { nombre: nombre[1], desde: j, hasta: k + 1 };
            }
        }
        return { nombre: nombre[1], desde: j, hasta: texto.length };
    }
    return null;
}

export const esComponente = (nombre: string) => /^[A-Z]/.test(nombre);

export interface ClaseSinLlave {
    clase: string;
    línea: number;
    sugerencia?: string;
}

export function nombresCortosDe(css: string): Set<string> {
    const nombres = new Set<string>();
    for (const m of css.matchAll(/:where\(\.ts\)\.((?:\\[0-9a-fA-F]{1,6} |\\.|[A-Za-z0-9_-])+)/g)) {
        if (!m[1].includes('\\:')) nombres.add(m[1].replace(/\\([0-9a-fA-F]{1,6}) /g, '$1').replaceAll('\\', ''));
    }
    return nombres;
}

export function clasesSinLlave(markup: string, nombresCortos: ReadonlySet<string> | readonly string[]): ClaseSinLlave[] {
    const cortos = nombresCortos instanceof Set ? nombresCortos : new Set(nombresCortos);
    const out: ClaseSinLlave[] = [];
    for (const m of markup.matchAll(/class="([^"]*)"/g)) {
        const tokens = m[1].split(/\s+/).filter(Boolean);
        const línea = markup.slice(0, m.index).split('\n').length;
        const etiqueta = etiquetaEn(markup, m.index);
        if (etiqueta && esComponente(etiqueta.nombre)) continue;
        if (tokens.includes('ts')) {
            for (const token of tokens) {
                const [, variante = '', resto] = /^(@?[a-z0-9]+:)?(.*)$/.exec(token)!;
                if (resto.startsWith('ts-')) out.push({ clase: token, línea, sugerencia: `en scope no lleva \`ts-\`: \`${variante}${resto.slice(3)}\`` });
            }
            continue;
        }
        for (const token of tokens) {
            const clase = token.replace(/^@?[a-z0-9]+:/, '');
            if (cortos.has(clase)) out.push({ clase: token, línea });
        }
    }
    return out;
}

export function aScope(markup: string): string {
    return markup.replace(/class="([^"]*)"/g, (_, clases: string) => {
        const tokens = clases.split(/\s+/).filter(Boolean);
        if (!tokens.some((t) => /^(@?[a-z0-9]+:)?ts-/.test(t))) return `class="${clases}"`;
        return `class="${['ts', ...tokens.map((t) => t.replace(/^((?:@?[a-z0-9]+:)?)ts-/, '$1'))].join(' ')}"`;
    });
}
