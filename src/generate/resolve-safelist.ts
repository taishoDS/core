// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { clasesSinLlave } from './llave-scope';
import { fallo, intentarClave, lanzarSiHay, vecino } from './resolve-extend';
import type { ConfigKeyError } from './errores-config';
import { validarCadena, type Envoltura } from './variantes';

export interface SafelistContexto {
    vocabulario: readonly string[];
    modificadores?: ReadonlySet<string>;
    prefijos: ReadonlyMap<string, Envoltura>;
    componentes: readonly string[];
    tonos?: readonly string[];
}

export interface SafelistResuelto {
    planas: string[];
    variantes: string[];
    componentes: string[];
}

export function resolveSafelist(safelist: unknown, ctx: SafelistContexto): SafelistResuelto {
    const out: SafelistResuelto = { planas: [], variantes: [], componentes: [] };
    if (safelist === undefined) return out;
    if (!Array.isArray(safelist)) throw fallo('safelist', { code: 'safelist-not-list', params: {} });
    const nombres = [...ctx.vocabulario, ...(ctx.tonos ?? [])];
    const vocabulario = new Set(nombres);
    const errores: ConfigKeyError[] = [];

    safelist.forEach((entrada: unknown, i) => {
        intentarClave(errores, () => {
            const ruta = `safelist[${i}]`;
            if (typeof entrada !== 'string' || entrada.trim() === '') throw fallo(ruta, { code: 'safelist-entry-empty', params: {} });
            const [, prefijo, base] = /^((?:@?[a-z0-9][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?:)*)(.*)$/.exec(entrada)!;
            const quien = `${ruta} (${JSON.stringify(entrada)})`;
            if (prefijo) {
                const r = validarCadena(prefijo.match(/[^:]+:/g)!, ctx.prefijos);
                if (!r.ok && r.motivo === 'desconocido') {
                    const sugerida = vecino(r.prefijo, ctx.prefijos.keys());
                    throw fallo(quien, { code: 'safelist-unknown-prefix', params: { prefix: r.prefijo, ...(sugerida && { suggestion: sugerida }) } });
                }
                if (!r.ok && r.motivo === 'data-ts') {
                    throw fallo(quien, { code: 'safelist-data-ts', params: { prefix: r.prefijo } });
                }
                if (!r.ok && r.canonica) throw fallo(quien, { code: 'safelist-out-of-order', params: { suggestion: r.canonica.join('') + base } });
                if (!r.ok) throw fallo(quien, { code: 'safelist-invalid-chain', params: {} });
            }
            if (base.includes(':')) throw fallo(quien, { code: 'safelist-misplaced-colon', params: {} });
            if (base.startsWith('ts-')) {
                const { sugerencia: s } = clasesSinLlave(`class="ts ${entrada}"`, [])[0] ?? {};
                const sinPrefijo = s?.slice(s.lastIndexOf(': `') + 3, -1);
                throw fallo(quien, { code: 'safelist-legacy-prefix', params: sinPrefijo !== undefined ? { suggestion: sinPrefijo } : {} });
            }

            const asterisco = base.indexOf('*');
            if (asterisco !== -1) {
                if (asterisco !== base.length - 1) {
                    throw fallo(quien, { code: 'safelist-star-not-last', params: {} });
                }
                const raiz = base.slice(0, -1);
                const hallados = raiz ? nombres.filter((n) => n.startsWith(raiz)) : [];
                if (hallados.length === 0) {
                    const familias = new Set(nombres.flatMap((n) => [...n.matchAll(/-/g)].map((m) => `${n.slice(0, m.index! + 1)}*`)));
                    const sugerida = vecino(base, familias);
                    throw fallo(quien, { code: 'safelist-family-empty', params: sugerida ? { suggestion: sugerida } : {} });
                }
                (prefijo ? out.variantes : out.planas).push(...hallados.map((n) => prefijo + n));
                return;
            }

            if (prefijo && ctx.componentes.includes(base)) throw fallo(quien, { code: 'safelist-component-variant', params: {} });
            if (ctx.modificadores?.has(base) && !vocabulario.has(base)) {
                if (prefijo) throw fallo(quien, { code: 'safelist-modifier-variant', params: {} });
                out.planas.push(entrada);
            } else if (vocabulario.has(base)) {
                (prefijo ? out.variantes : out.planas).push(entrada);
            } else if (ctx.componentes.includes(base)) {
                out.componentes.push(base);
            } else {
                const candidatos = [...nombres, ...ctx.componentes].map((n) => prefijo + n);
                const sugerida = vecino(entrada, candidatos);
                throw fallo(quien, { code: 'safelist-unknown', params: sugerida ? { suggestion: sugerida } : {} });
            }
        });
    });
    lanzarSiHay(errores);
    return out;
}
