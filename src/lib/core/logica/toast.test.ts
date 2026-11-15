// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { iniciar, restante, pausar, reanudar, estaPausado } from './toast';

describe('Toast — reloj con pausa', () => {
  it('descuenta el tiempo transcurrido', () => {
    expect(restante(iniciar(4000, 1000), 2500)).toBe(2500);
  });

  it('nunca devuelve negativo', () => {
    expect(restante(iniciar(1000, 0), 5000)).toBe(0);
  });

  it('pausar congela lo que falta aunque pase el tiempo', () => {
    const p = pausar(iniciar(4000, 0), 1500);
    expect(p).toEqual({ falta: 2500, desde: null });
    expect(restante(p, 99999)).toBe(2500);
  });

  it('pausar → reanudar retoma desde lo que faltaba', () => {
    const p = pausar(iniciar(4000, 0), 1000);
    const r = reanudar(p, 10000);
    expect(restante(r, 10500)).toBe(2500);
  });

  it('pausar y reanudar son idempotentes', () => {
    const p = pausar(iniciar(4000, 0), 1000);
    expect(pausar(p, 2000)).toBe(p);
    const r = reanudar(p, 3000);
    expect(reanudar(r, 3500)).toBe(r);
  });

  it('puntero o foco alcanzan para pausar', () => {
    expect(estaPausado(false, false)).toBe(false);
    expect(estaPausado(true, false)).toBe(true);
    expect(estaPausado(false, true)).toBe(true);
  });
});
