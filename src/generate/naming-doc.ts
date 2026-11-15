// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import {
    PREFIJOS, PALABRAS_SOLAS, UTILIDADES_PROPIAS, CONTEXTOS, MODIFICADORES, CLASES_DE_TEMA, prefijoMasLargo, type Valor,
} from './naming-table';
import { renombrar } from './naming-renames';

const celda = (s: string) => s.replaceAll('|', '\\|');

export function describirValor(v: Valor): string {
    switch (v.t) {
        case 'espaciado':
            return `ritmo (\`none\`…\`double\`) o px${v.auto ? ', `auto`' : ''}${v.neg ? ', `neg-` opcional' : ''}`;
        case 'escala':
            return `escala \`${v.de}\`${v.extra?.length ? ` + ${v.extra.map((x) => `\`${x}\``).join(', ')}` : ''}`;
        case 'px':
            return ['entero en px', ...(v.extra ?? []).map((x) => `\`${x}\``), ...(v.patron ? [`patrón \`${v.patron.source}\``] : [])].join(', ');
        case 'conteo':
            return ['entero', ...(v.extra ?? []).map((x) => `\`${x}\``)].join(', ');
        case 'palabras':
            return [...v.lista.map((x) => `\`${x}\``), ...(v.patron ? [`patrón \`${v.patron.source}\``] : [])].join(', ');
        case 'color':
            return `color del vocabulario${v.ancho ? ' o `<ancho>-<color>`' : ''}${v.extra?.length ? ', ' + v.extra.map((x) => `\`${x}\``).join(', ') : ''}`;
        case 'ring-shadow':
            return '`<talle de shadow>-<color>`';
        case 'familia':
            return `familia de color (sin paso)${v.extra?.length ? ', ' + v.extra.map((x) => `\`${x}\``).join(', ') : ''}`;
    }
}

export function renderPrefijos(emitidos: readonly string[]): string {
    const candidatos = [...new Set([
        ...emitidos,
        ...emitidos.map((n) => renombrar(n)?.nuevo).filter((n): n is string => !!n),
    ])];
    const ejemplo = (p: string) =>
        candidatos.find((n) => prefijoMasLargo(n.replace(/^ts-/, '')) === p && !/-negative$|-important$/.test(n));
    const filas = Object.entries(PREFIJOS).map(([p, def]) => {
        const ej = ejemplo(p);
        const nota = def.legado ? `legado: usar \`${def.legado.sucesor}\`` : '';
        return `| \`${p}\` | ${celda(def.prop)} | ${celda(describirValor(def.valor))} | ${ej ? `\`${ej}\`` : ''} | ${nota} |`;
    });
    return ['| Prefijo | Propiedad CSS | Valor | Ejemplo | Nota |', '|---|---|---|---|---|', ...filas].join('\n');
}

export function renderSolas(): string {
    const solas = Object.entries(PALABRAS_SOLAS).map(([w, prop]) => `| \`${w}\` | ${celda(prop)} |`);
    return [
        '**Palabras solas** (un valor de display, position, visibility o decoración, o un caso de un solo uso):',
        '',
        '| Palabra | Propiedad |',
        '|---|---|',
        ...solas,
        '',
        '**Utilidades propias** (una composición con nombre propio): ' + UTILIDADES_PROPIAS.map((u) => `\`${u}\``).join(', ') + '.',
        '',
        '**Clases de contexto** (cambian los tokens de un subárbol, no estilan un elemento): ' + CONTEXTOS.map((c) => `\`${c}\``).join(', ') + '.',
    ].join('\n');
}

export function renderModificadores(): string {
    const l = (xs: readonly string[], sufijo = '') => xs.map((x) => `\`${x}${sufijo}\``).join(', ');
    return [
        '**Lista cerrada de modificadores** (cualquier otra clase sin `ts-` en `components.css` es una violación del gate):',
        '',
        `- Familias, \`<familia>-<valor>\`: ${l(MODIFICADORES.prefijos, '-*')}.`,
        `- Palabras enteras: ${l(MODIFICADORES.palabras)}.`,
        '',
        `**Clases de tema** (van en \`<html>\`, son la única clase sin \`ts-\` que puede ir como ancestro, \`.dark &\`; no son modificadores): ${l(CLASES_DE_TEMA)}.`,
    ].join('\n');
}

const BLOQUES = ['prefijos', 'solas', 'modificadores'] as const;

export function aplicarBloques(md: string, emitidos: readonly string[]): string {
    const render = { prefijos: renderPrefijos(emitidos), solas: renderSolas(), modificadores: renderModificadores() };
    let out = md;
    for (const b of BLOQUES) {
        const re = new RegExp(`(<!-- ${b}:inicio -->\\n)[\\s\\S]*?(\\n<!-- ${b}:fin -->)`);
        if (!re.test(out)) throw new Error(`NAMING.md: faltan los marcadores <!-- ${b}:inicio --> / <!-- ${b}:fin -->`);
        out = out.replace(re, (_, a, z) => `${a}${render[b]}${z}`);
    }
    return out;
}
