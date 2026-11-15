// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { MEDIA_OSCURO, RAIZ_POR_SISTEMA, type DarkMode } from './modo-oscuro';

export const SIN_LIGHT_DARK = '@supports not (color: light-dark(#000, #fff))';

const FUNCION = 'light-dark(';
type Decl = readonly [nombre: string, valor: string];

export function brazoDeModo(valor: string, brazo: 0 | 1): string {
    for (let ini = valor.indexOf(FUNCION); ini >= 0; ini = valor.indexOf(FUNCION)) {
        const desde = ini + FUNCION.length;
        let prof = 1;
        let coma = -1;
        let fin = desde;
        for (; prof > 0; fin++) {
            if (valor[fin] === '(') prof++;
            else if (valor[fin] === ')') prof--;
            else if (valor[fin] === ',' && prof === 1 && coma < 0) coma = fin;
        }
        valor = valor.slice(0, ini) + (brazo === 0 ? valor.slice(desde, coma) : valor.slice(coma + 1, fin - 1)).trim() + valor.slice(fin);
    }
    return valor;
}

function declaraciones(cuerpo: string): Decl[] {
    const out: Decl[] = [];
    for (const d of cuerpo.split(';')) {
        const i = d.indexOf(':');
        if (i > 0 && d.slice(0, i).trim().startsWith('--')) out.push([d.slice(0, i).trim(), d.slice(i + 1).trim()]);
    }
    return out;
}

function conDosModos(decls: readonly Decl[]): Decl[] {
    const propias = decls.filter(([n]) => !n.startsWith('--ts-material-'));
    const dos = new Set(propias.filter(([, v]) => v.includes(FUNCION) || v.includes('var(--color-')).map(([n]) => n));
    for (let antes = -1; antes !== dos.size; ) {
        antes = dos.size;
        for (const [n, v] of propias) if ([...v.matchAll(/var\(\s*(--[\w-]+)/g)].some((m) => dos.has(m[1]))) dos.add(n);
    }
    return propias.filter(([n]) => dos.has(n));
}

function reglas(decls: readonly Decl[], darkMode: DarkMode, margen: string): string {
    const regla = (selector: string, brazo: 0 | 1, m = margen) =>
        `${m}${selector} {\n${decls.map(([n, v]) => `${m}  ${n}: ${brazoDeModo(v, brazo)};\n`).join('')}${m}}\n`;
    return (
        regla(':root, .scheme-light', 0) +
        (darkMode === 'media' ? `${margen}@media ${MEDIA_OSCURO} {\n${regla(RAIZ_POR_SISTEMA, 1, `${margen}  `)}${margen}}\n` : '') +
        regla('.dark, .scheme-dark', 1)
    );
}

export function bloqueSinLightDark(base: string, darkMode: DarkMode = 'class', adicional = ''): string {
    const decls = conDosModos(declaraciones(base));
    if (decls.length === 0) return '';
    const alias = decls.filter(([, v]) => !v.includes(FUNCION));
    const donde = `.scheme-light, .dark, .scheme-dark${darkMode === 'media' ? `, ${RAIZ_POR_SISTEMA}` : ''}`;
    const deAlias = alias.length ? `  ${donde} {\n${alias.map(([n, v]) => `    ${n}: ${v};\n`).join('')}  }\n` : '';
    return `\n${SIN_LIGHT_DARK} {\n${reglas(decls.filter(([, v]) => v.includes(FUNCION)), darkMode, '  ')}${deAlias}${adicional}}\n`;
}
