// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ComponentManifest } from './emit-manifest';
import { erroresDeLectura, parsearExtension, type GrupoParseado } from './extension-parser';
import { ConfigError } from './errores-config';
import type { TaishoExtensions } from './extension';
import manifiestoJSON from '../lib/css/manifiesto-componentes.json';

export const manifiestoDelCore = manifiestoJSON as ComponentManifest;

export interface CssDeExtensiones {
    components: string;
    utilities: string;
}

export function porPaquete(extensiones: TaishoExtensions): Array<[paquete: string, extension: TaishoExtensions[string]]> {
    return Object.entries(extensiones).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function leida(e: TaishoExtensions[string], paquete: string): GrupoParseado[] {
    const grupos = parsearExtension(e, paquete);
    const errores = erroresDeLectura(grupos);
    if (errores.length) throw new ConfigError(errores);
    return grupos;
}

export function manifiestoDe(extensiones: TaishoExtensions = {}): ComponentManifest {
    const lista = porPaquete(extensiones);
    if (lista.length === 0) return manifiestoDelCore;
    const componentes: ComponentManifest['componentes'] = Object.assign(Object.create(null), manifiestoDelCore.componentes);
    for (const [paquete, e] of lista) {
        const grupos = leida(e, paquete);
        for (const [slug, c] of Object.entries(e.components ?? {})) {
            const bloques = [...new Set(grupos.filter((g) => g.slug === slug).flatMap((g) => g.parse.bloques.map((b) => b.name.slice(3))))];
            componentes[slug] = { gancho: null, bloques, runtime: c.roots.filter((r) => bloques.includes(r)) };
        }
    }
    return { componentes, sueltos: manifiestoDelCore.sueltos };
}

export function cssDeExtensiones(extensiones: TaishoExtensions = {}): CssDeExtensiones {
    let components = '';
    let utilities = '';
    for (const [paquete, e] of porPaquete(extensiones)) {
        for (const g of leida(e, paquete)) {
            const css = g.parse.bloques.map((b) => b.css).join('');
            if (g.slug === undefined) utilities += css ? `\n${css}` : '';
            else components += `\n${css}`;
        }
    }
    return { components, utilities };
}

export interface TokensDeComponente {
    slug: string;
    prefijo: string;
    tokens: Record<string, string>;
}

export function tokensDeExtensiones(extensiones: TaishoExtensions = {}): TokensDeComponente[] {
    const out: TokensDeComponente[] = [];
    for (const [, e] of porPaquete(extensiones)) {
        for (const [slug, c] of Object.entries(e.components ?? {})) {
            if (c.tokens && Object.keys(c.tokens).length && c.roots[0] !== undefined) out.push({ slug, prefijo: c.roots[0], tokens: Object.assign(Object.create(null), c.tokens) });
        }
    }
    return out;
}
