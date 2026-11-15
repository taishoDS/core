// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
const ANCHOS_DEL_FOCO = ['1', '4'];
const ES_CERO = /^0+(\.0+)?(px|em|rem)?$/;

export function anchosDeFocoEnCero(borderWidths: Record<string, string> | undefined): [string, string][] {
    return ANCHOS_DEL_FOCO.flatMap((n): [string, string][] => (borderWidths?.[n] !== undefined && ES_CERO.test(borderWidths[n].trim()) ? [[n, borderWidths[n]]] : []));
}

export const textoBordeEnCero = (tema: string, nombre: string, valor: string): string =>
    `Tema "${tema}": borderWidths.${nombre} vale ${valor} y ese ancho dibuja el foco (${nombre === '1' ? 'su línea' : 'su halo'}), así que ese trazo desaparece y el foco se ve menos o nada. ` +
    `Se usa un ancho mayor que 0, o se deja el de fábrica.`;
