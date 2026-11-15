// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface Envoltura {
    valor: string;
    tipo: 'media' | 'max' | 'container' | 'selector' | 'print';
    en?: string;
}

const CONTAINERS: Record<string, string> = {
    '@sm:': '24rem',
    '@md:': '28rem',
    '@lg:': '32rem',
    '@xl:': '36rem',
    '@2xl:': '42rem',
    '@3xl:': '48rem',
    '@4xl:': '56rem',
    '@5xl:': '64rem',
    '@6xl:': '72rem',
    '@7xl:': '80rem',
};

const ARIA = ['busy', 'checked', 'disabled', 'expanded', 'hidden', 'pressed', 'readonly', 'required', 'selected', 'invalid'];

const HOVER = '@media (hover: hover)';

export function tablaPrefijos(screens: Record<string, string>): Map<string, Envoltura> {
    const tabla = new Map<string, Envoltura>();
    const porAncho = Object.entries(screens).sort(([, a], [, b]) => parseFloat(a) - parseFloat(b));
    for (const [k, px] of porAncho) tabla.set(`${k}:`, { valor: `${parseFloat(px) / 16}rem`, tipo: 'media' });
    for (const [k, px] of [...porAncho].reverse()) tabla.set(`max-${k}:`, { valor: `${parseFloat(px) / 16}rem`, tipo: 'max' });
    for (const [k, valor] of Object.entries(CONTAINERS)) tabla.set(k, { valor, tipo: 'container' });
    tabla.set('print:', { valor: '', tipo: 'print' });
    tabla.set('hover:', { valor: ':hover', tipo: 'selector', en: HOVER });
    tabla.set('focus:', { valor: ':focus', tipo: 'selector' });
    tabla.set('focus-visible:', { valor: ':focus-visible', tipo: 'selector' });
    tabla.set('active:', { valor: ':active', tipo: 'selector' });
    for (const a of ARIA) tabla.set(`aria-${a}:`, { valor: `[aria-${a}="true"]`, tipo: 'selector' });
    tabla.set('checked:', { valor: ':checked', tipo: 'selector' });
    tabla.set('invalid:', { valor: ':invalid', tipo: 'selector' });
    tabla.set('disabled:', { valor: ':is(:disabled, [aria-disabled="true"])', tipo: 'selector' });
    return tabla;
}

const ORDEN_ESTADOS = ['hover', 'focus', 'focus-visible', 'active', 'aria', 'data', 'checked', 'invalid', 'disabled'];

const rangoDe = (prefijo: string) => {
    const nombre = prefijo.slice(0, -1);
    const k = nombre.startsWith('aria-') ? 'aria' : nombre.startsWith('data-') ? 'data' : nombre;
    return ORDEN_ESTADOS.indexOf(k);
};

export interface Segmento {
    prefijo: string;
    tipo: 'contexto' | 'print' | 'grupo' | 'estado';
    sufijo: string;
    media?: string;
    container?: string;
    orden: number[];
}

const NOMBRE = /^[a-z][a-z0-9-]*$/;

export function segmento(prefijo: string, tabla: ReadonlyMap<string, Envoltura>): Segmento | undefined {
    const e = tabla.get(prefijo);
    if (e) {
        if (e.tipo === 'media') return { prefijo, tipo: 'contexto', sufijo: '', media: `(width >= ${e.valor})`, orden: [] };
        if (e.tipo === 'max') return { prefijo, tipo: 'contexto', sufijo: '', media: `(width < ${e.valor})`, orden: [] };
        if (e.tipo === 'container') return { prefijo, tipo: 'contexto', sufijo: '', container: `(width >= ${e.valor})`, orden: [] };
        if (e.tipo === 'print') return { prefijo, tipo: 'print', sufijo: '', media: 'print', orden: [] };
        return { prefijo, tipo: 'estado', sufijo: e.valor, media: e.en?.replace('@media ', ''), orden: [2 + rangoDe(prefijo)] };
    }
    const dato = /^data-(.+):$/.exec(prefijo);
    if (dato && NOMBRE.test(dato[1]) && !dato[1].startsWith('ts-')) {
        return { prefijo, tipo: 'estado', sufijo: `[data-${dato[1]}]`, orden: [2 + rangoDe(prefijo)] };
    }
    const g = /^(group|peer)-(.+?)(?:\/([^/:]+))?:$/.exec(prefijo);
    if (g && (g[3] === undefined || NOMBRE.test(g[3]))) {
        const interno = segmento(`${g[2]}:`, tabla);
        if (interno?.tipo === 'estado') {
            const marca = `:where(.ts.${g[1]}${g[3] ? `\\/${g[3]}` : ''})`;
            const nexo = g[1] === 'group' ? ' *' : ' ~ *';
            return {
                prefijo, tipo: 'grupo', sufijo: `:is(${marca}${interno.sufijo}${nexo})`, media: interno.media,
                orden: [g[1] === 'group' ? 0 : 1, ...interno.orden],
            };
        }
    }
    return undefined;
}

const TIPOS = ['contexto', 'print', 'grupo', 'estado'] as const;

export type Cadena =
    | { ok: true; segmentos: Segmento[] }
    | { ok: false; motivo: 'desconocido'; prefijo: string }
    | { ok: false; motivo: 'data-ts'; prefijo: string }
    | { ok: false; motivo: 'orden'; canonica?: string[] };

export function validarCadena(cadena: readonly string[], tabla: ReadonlyMap<string, Envoltura>): Cadena {
    const segmentos: Segmento[] = [];
    for (const p of cadena) {
        const s = segmento(p, tabla);
        if (!s) return /^data-ts-/.test(p) ? { ok: false, motivo: 'data-ts', prefijo: p } : { ok: false, motivo: 'desconocido', prefijo: p };
        segmentos.push(s);
    }
    const idx = segmentos.map((s) => TIPOS.indexOf(s.tipo));
    if (idx.every((n, i) => i === 0 || n > idx[i - 1]) && segmentos.length <= 3) return { ok: true, segmentos };
    const repetido = new Set(idx).size !== idx.length;
    if (repetido || segmentos.length > 3) return { ok: false, motivo: 'orden' };
    return { ok: false, motivo: 'orden', canonica: [...segmentos].sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo)).map((s) => s.prefijo) };
}
