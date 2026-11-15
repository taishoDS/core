// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { FontFaceDef } from '../config/taisho.types';

/**
 * @fontsource publica un CSS por combinación alfabeto+peso
 * (`latin-400.css`), además del `400.css` que trae TODOS los alfabetos.
 * Importamos el específico: es la única forma de no bajar alfabetos ajenos.
 */
export function buildFontsCSS(userFontFaces: FontFaceDef[], respaldos: RespaldoFuente[] = []): string {
    let css = '/* Archivo auto-generado: FONTS */\n';
    css += '/* Se genera desde las `fontFaces` de la config. NO editar a mano: se sobrescribe. */\n\n';

    for (const face of userFontFaces) {
        const estilos = face.styles ?? ['normal'];
        css += `/* ${face.source} — ${face.subsets.join(', ')} · ${face.weights.join(', ')}${estilos.includes('italic') ? ' · ' + estilos.join(', ') : ''} */\n`;
        for (const subset of face.subsets) {
            for (const weight of face.weights) {
                for (const estilo of estilos) {
                    css += `@import "${face.source}/${subset}-${weight}${estilo === 'italic' ? '-italic' : ''}.css";\n`;
                }
            }
        }
        css += '\n';
    }
    for (const r of respaldos) {
        css += `@font-face { font-family: "${r.familia} Fallback"; src: local("${r.local}");${r.estilo ? ` font-style: ${r.estilo};` : ''} size-adjust: ${r.sizeAdjust}; ascent-override: ${r.ascent}; descent-override: ${r.descent}; line-gap-override: ${r.lineGap};${r.unicodeRange ? ` unicode-range: ${r.unicodeRange};` : ''} }\n`;
    }

    return css;
}

/** El respaldo ajustado de una familia: la fuente local y sus correcciones (porcentajes CSS). */
export interface RespaldoFuente {
    familia: string;
    local: string;
    sizeAdjust: string;
    ascent: string;
    descent: string;
    lineGap: string;
    /** `italic`: el respaldo de la itálica (Arial Italic / Courier New Italic); sin él, el de la normal. */
    estilo?: 'italic';
    /** Los alfabetos de la fuente (los `unicode-range` de sus `subsets`): fuera de ellos el respaldo no aplica. */
    unicodeRange?: string;
}

const GENERICAS = /^(ui-)?(sans-serif|serif|monospace|system-ui|cursive|fantasy|math|emoji|fangsong|rounded)$|^-apple-system$|^BlinkMacSystemFont$/i;

export function conRespaldo(pila: string): string {
    const partes = pila.split(',');
    const primera = partes[0].trim().replace(/^['"]|['"]$/g, '');
    if (!primera || GENERICAS.test(primera) || primera.endsWith(' Fallback') || pila.includes(`"${primera} Fallback"`)) return pila;
    return [partes[0], ` "${primera} Fallback"`, ...partes.slice(1)].join(',');
}
