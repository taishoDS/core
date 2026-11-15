// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface Reloj {
  falta: number;
  desde: number | null;
}

export function iniciar(duracion: number, ahora: number): Reloj {
  return { falta: duracion, desde: ahora };
}

export function restante(r: Reloj, ahora: number): number {
  return Math.max(0, r.desde === null ? r.falta : r.falta - (ahora - r.desde));
}

export function pausar(r: Reloj, ahora: number): Reloj {
  return r.desde === null ? r : { falta: restante(r, ahora), desde: null };
}

export function reanudar(r: Reloj, ahora: number): Reloj {
  return r.desde === null ? { falta: r.falta, desde: ahora } : r;
}

export function estaPausado(punteroAdentro: boolean, focoAdentro: boolean): boolean {
  return punteroAdentro || focoAdentro;
}
