// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { BLOQUES_COMPARTIDOS, type ComponentManifest } from './emit-manifest.ts';

export const ORDEN_CAPAS = '@layer base, components, utilities, states, utility-states, print;';

export interface CdnPartes {
    base: string;
    components: string;
    porComponente: Record<string, string>;
    sinBloques: string[];
}

function finDeItem(css: string, ini: number): number {
    if (css.startsWith('/*', ini)) return css.indexOf('*/', ini) + 2;
    let prof = 0;
    for (let i = ini; i < css.length; i++) {
        const c = css[i];
        if (c === '/' && css[i + 1] === '*') i = css.indexOf('*/', i) + 1;
        else if (c === '"' || c === "'") {
            for (i++; css[i] !== c; i++) if (css[i] === '\\') i++;
        } else if (c === '{') prof++;
        else if (c === '}' && --prof === 0) return i + 1;
        else if (c === ';' && prof === 0) return i + 1;
    }
    throw new Error('CSS sin cerrar al partir taisho.full.css.');
}

export function separarItems(cuerpo: string): string[] {
    const items: string[] = [];
    for (let i = 0; i < cuerpo.length; ) {
        if (/\s/.test(cuerpo[i])) {
            i++;
            continue;
        }
        const f = finDeItem(cuerpo, i);
        items.push(cuerpo.slice(i, f));
        i = f;
    }
    return items;
}

function bloqueDe(item: string): string | null {
    const m = /^:where\(\.ts\)\.((?:[^\s,{:.[>+~\\]|\\.)*)\s*[,{]/.exec(item);
    return m ? m[1].replaceAll('\\', '') : null;
}

const CAPAS_DE_ITEMS = ['components', 'utilities', 'states', 'utility-states', 'print'] as const;
type Capa = (typeof CAPAS_DE_ITEMS)[number];

const vacias = (): Record<Capa, string[]> => ({ components: [], utilities: [], states: [], 'utility-states': [], print: [] });
const bloqueCapa = (capa: string, items: string[]) => (items.length ? `@layer ${capa} {\n${items.join('\n')}\n}\n` : '');
const capasDe = (porCapa: Record<Capa, string[]>, nombres: readonly Capa[]) => nombres.map((c) => bloqueCapa(c, porCapa[c])).join('');

export function partirFull(full: string, manifest: ComponentManifest, coreSlugs: readonly string[]): CdnPartes {
    const duenoDe = new Map<string, string>();
    for (const [slug, c] of Object.entries(manifest.componentes)) for (const b of c.bloques) duenoDe.set(b, slug);
    const core = new Set(coreSlugs);

    const ini = full.indexOf(ORDEN_CAPAS);
    if (ini < 0 || !full.includes('@layer utilities {\n')) throw new Error('taisho.full.css no tiene la forma esperada (@layer utilities).');

    const base = vacias();
    const porSlug: Record<string, Record<Capa, string[]>> = {};
    const todos = vacias();
    let reset = '';
    for (const capaItem of separarItems(full.slice(ini + ORDEN_CAPAS.length))) {
        const m = /^@layer ([\w-]+) \{\n/.exec(capaItem);
        if (!m) continue;
        if (m[1] === 'base') {
            reset = capaItem;
            continue;
        }
        const capa = m[1] as Capa;
        const cuerpo = capaItem.slice(m[0].length, capaItem.lastIndexOf('\n}'));
        for (const item of separarItems(cuerpo)) {
            const bloque = bloqueDe(item);
            const compartidos = bloque === null ? undefined : BLOQUES_COMPARTIDOS[bloque];
            if (compartidos) {
                for (const s of compartidos) if (core.has(s)) (porSlug[s] ??= vacias())[capa].push(item);
                todos[capa].push(item);
                continue;
            }
            const slug = bloque === null ? undefined : duenoDe.get(bloque);
            if (slug === undefined) base[capa].push(item);
            else if (core.has(slug)) {
                (porSlug[slug] ??= vacias())[capa].push(item);
                todos[capa].push(item);
            }
        }
    }

    const encabezado = full.slice(0, ini);
    const capa = (porCapa: Record<Capa, string[]>) => `${encabezado}${ORDEN_CAPAS}\n\n${capasDe(porCapa, CAPAS_DE_ITEMS)}`;

    const porComponente: Record<string, string> = {};
    for (const slug of coreSlugs) {
        const items = porSlug[slug];
        if (!items) continue;
        porComponente[slug] = capa(items);
    }
    return {
        base: `${encabezado}${ORDEN_CAPAS}\n\n${reset}\n${capasDe(base, CAPAS_DE_ITEMS)}`,
        components: capa(todos),
        porComponente,
        sinBloques: coreSlugs.filter((s) => !porSlug[s]),
    };
}
