// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type TsVars = Record<`--ts-${string}`, string | number | null | undefined>;

const compartido = globalThis as unknown as Record<symbol, WeakMap<HTMLElement, Map<string, string>> | undefined>;
const propias = (compartido[Symbol.for('taisho.core.vars')] ??= new WeakMap());

export function setVars(el: HTMLElement, vars: TsVars): void {
  let mias = propias.get(el);
  for (const [nombre, valor] of Object.entries(vars)) {
    if (valor === null || valor === undefined) {
      if (mias?.delete(nombre)) el.style.removeProperty(nombre);
      continue;
    }
    const v = String(valor);
    if (!mias) propias.set(el, (mias = new Map()));
    mias.set(nombre, v);
    if (el.style.getPropertyValue(nombre) !== v) el.style.setProperty(nombre, v);
  }
}
