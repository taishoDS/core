// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export const letterSpacing: Record<string, string> = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
};

const SELECTOR_RTL = ':where(h1, h2, h3, h4, h5, h6, label, legend, [class*="type-heading-"], [class*="type-label-"], [class*="-title"]):where(:lang(ar), :lang(fa), :lang(ur), :lang(he))';

export const trackingRtl = (escala: Record<string, string>): string[] =>
    Object.keys(escala).filter((k) => k !== 'normal').map((k) => `--ts-ls-${k}: ${escala.normal};`);

export const interlineadoRtl = (escala: Record<string, string>, enPx: (valor: string) => string = (v) => v): string[] =>
    Object.entries(escala).map(([k, v]) => {
        const limpio = v.trim();
        if (limpio === 'normal') return `--ts-lh-${k}: 1.35;`;
        const sinUnidad = /^(\d+\.?\d*|\.\d+)$/.test(limpio);
        return `--ts-lh-${k}: ${sinUnidad ? String(Math.max(1.35, Number(limpio))) : `max(1.35em, ${enPx(v)})`};`;
    });

export const reglaRtl = (declaraciones: string[]): string =>
    declaraciones.length ? `${SELECTOR_RTL} { ${declaraciones.join(' ')} }` : '';

export const podarReglaRtl = (css: string, vivas: ReadonlySet<string>): string => {
    const abre = `${SELECTOR_RTL} { `;
    const i = css.indexOf(abre);
    if (i < 0) return css;
    const fin = css.indexOf(' }', i);
    const declaraciones = (css.slice(i + abre.length, fin).match(/--[\w-]+:[^;]*;/g) ?? []).filter((d) => vivas.has(d.slice(0, d.indexOf(':'))));
    return css.slice(0, i) + reglaRtl(declaraciones) + css.slice(fin + 2);
};
