// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { esDesarrollo } from './aviso-blanca';
import { DEFAULT_STATES } from './default-states';
import { mismaSemilla, UMBRAL_AA } from './palette';
import type { EscalasDeSemillas } from './palette';

const claveSeedFit = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`);
const ratioEs = (r: number) => `${r.toFixed(2).replace('.', ',')}:1${r < UMBRAL_AA ? ' (por debajo de 4,5:1)' : ''}`;
const opcion = (color: string, v: 'shift' | 'keep') => `\`seedFit: { ${claveSeedFit(color)}: '${v}' }\``;
const modoEs = (modo: 'light' | 'dark') => (modo === 'light' ? 'claro' : 'oscuro');

export interface MedidasDeSemilla { theme: string; color: string; seed: string; mode: 'light' | 'dark'; step: string; text: number; bg: number; textShifted: number; bgShifted: number }

export const textoSemillaBajoContraste = (p: MedidasDeSemilla): string =>
    `Tema "${p.theme}": el color "${p.color}" (${p.seed}) no llega a AA en el modo ${modoEs(p.mode)}: texto encima ${ratioEs(p.text)} y contra el fondo ${ratioEs(p.bg)}. ` +
    `Se adaptó al borde del paso ${p.step}: texto encima ${ratioEs(p.textShifted)} y contra el fondo ${ratioEs(p.bgShifted)}. ` +
    `Para dejarlo así sin aviso se escribe ${opcion(p.color, 'shift')}; para conservar el color exacto, ${opcion(p.color, 'keep')}.`;

export const textoSemillaExacta = (p: MedidasDeSemilla): string =>
    `Tema "${p.theme}": el color "${p.color}" (${p.seed}) queda exacto en el modo ${modoEs(p.mode)}, entre dos pasos de la escala: texto encima ${ratioEs(p.text)} y contra el fondo ${ratioEs(p.bg)}, los dos con AA (4,5:1). ` +
    `Para no ver esta nota se escribe ${opcion(p.color, 'keep')}; para adaptarlo al borde del paso ${p.step} (texto encima ${ratioEs(p.textShifted)}, contra el fondo ${ratioEs(p.bgShifted)}), ${opcion(p.color, 'shift')}.`;

const avisadas = new Set<string>();

/** En el navegador: `seed-low-contrast` por `console.warn` y `seed-exact` por `console.info`, una vez por color y modo. Un estado con el valor de fábrica no avisa, como en el build. */
export function avisarSemillasEntrePasos(escalas: EscalasDeSemillas, semillas: Record<string, string>, pasos: readonly string[]): void {
    if (!esDesarrollo()) return;
    for (const [color, { light, dark }] of Object.entries(escalas)) {
        if (mismaSemilla(semillas[color], DEFAULT_STATES[color])) continue;
        for (const [mode, escala] of [['light', light], ['dark', dark]] as const) {
            const fit = escala.fit;
            if (!fit || fit.chosen) continue;
            const clave = `${color}:${semillas[color]}:${mode}:${fit.resolved}`;
            if (avisadas.has(clave)) continue;
            avisadas.add(clave);
            const medidas = { theme: 'runtime', color, seed: semillas[color], mode, step: pasos[fit.step], text: fit.text, bg: fit.bg, textShifted: fit.textShifted, bgShifted: fit.bgShifted };
            if (fit.resolved === 'shift') console.warn(`[TaishoDS] ${textoSemillaBajoContraste(medidas)}`);
            else console.info(`[TaishoDS] ${textoSemillaExacta(medidas)}`);
        }
    }
}
