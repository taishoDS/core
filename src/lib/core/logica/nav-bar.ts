// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function cierraConEscape(key: string, abierto: boolean): boolean {
  return abierto && key === 'Escape';
}

export function cierraConClickAfuera(abierto: boolean, dentroDeLaBarra: boolean): boolean {
  return abierto && !dentroDeLaBarra;
}
