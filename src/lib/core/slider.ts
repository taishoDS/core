// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import {
    clampThumb, computeFillPercent, computeRangeFill, formatSliderValue, joinSliderRange, nearestThumb, normalizeRange, normalizeStops, pageStopStep,
    ratioFromOffset, topThumb, valueFromRatio, SLIDER_KEYS, SLIDER_THUMB_PX, type SliderRange, type SliderSize,
} from './logica/slider';
import { setVars } from './vars';
import { P, avisar, contenedor } from './dom';
import { emitir } from './eventos';

const anterior = new WeakMap<HTMLInputElement, string>();
let teclaApretada = false;
const pendientes = new Set<HTMLElement>();
const sucias = new Set<HTMLElement>();
let arrastre: { rail: HTMLElement; thumb: 0 | 1 } | null = null;

const inputs = (raiz: HTMLElement): HTMLInputElement[] =>
    [...raiz.querySelectorAll<HTMLInputElement>('input[type="range"]')].filter((i) => i.closest(`[${P}slider]`) === raiz);
const esRango = (raiz: HTMLElement) => raiz.hasAttribute(`${P}slider-range`);
const soloLectura = (i: HTMLInputElement) => i.getAttribute('aria-readonly') === 'true';
const numero = (i: HTMLInputElement, atributo: 'min' | 'max' | 'step', porDefecto: number) => {
    const n = parseFloat(i.getAttribute(atributo) ?? '');
    return Number.isFinite(n) ? n : porDefecto;
};
const tamano = (raiz: HTMLElement): SliderSize => (raiz.classList.contains('size-sm') ? 'sm' : raiz.classList.contains('size-lg') ? 'lg' : 'md');

/** Paradas de `data-ts-slider-values`. Con ellas, los inputs trabajan en posiciones (0 … n-1) y el valor real sale de la lista. */
const paradas = (raiz: HTMLElement): number[] | null =>
    normalizeStops((raiz.getAttribute(`${P}slider-values`) ?? '').split(',').map(parseFloat));
const real = (pasos: number[] | null, pos: number): number => (pasos ? (pasos[pos] ?? pos) : pos);
/** Texto de la parada `pos`: el de `data-ts-slider-texts` (separados por `|`) o la plantilla de `data-ts-slider-format`. */
function texto(raiz: HTMLElement, pasos: number[] | null, pos: number): string {
    const propio = raiz.getAttribute(`${P}slider-texts`)?.split('|')[pos];
    return propio ?? formatSliderValue(real(pasos, pos), raiz.getAttribute(`${P}slider-format`) ?? '{v}');
}
/** Texto para el lector (`aria-valuetext`): `data-ts-slider-valuetexts` (lista con `|`), `data-ts-slider-valuetext` (plantilla) o, sin ellos, el texto visible. */
function dicho(raiz: HTMLElement, pasos: number[] | null, pos: number): string {
    const propio = raiz.getAttribute(`${P}slider-valuetexts`)?.split('|')[pos];
    if (propio !== undefined) return propio;
    const plantilla = raiz.getAttribute(`${P}slider-valuetext`);
    return plantilla ? formatSliderValue(real(pasos, pos), plantilla) : texto(raiz, pasos, pos);
}
/** Los campos ocultos que llevan el valor real al form (con paradas el input nativo viaja con la posición, así que va sin `name`). */
const ocultos = (raiz: HTMLElement): HTMLInputElement[] =>
    [...raiz.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].filter((i) => i.closest(`[${P}slider]`) === raiz);

function par(raiz: HTMLElement): SliderRange {
    const [a, b] = inputs(raiz);
    return normalizeRange([parseFloat(a.value), parseFloat(b.value)], numero(a, 'min', 0), numero(a, 'max', 100));
}

function crudo(raiz: HTMLElement): SliderRange {
    const [a, b] = inputs(raiz);
    return [parseFloat(a.value), parseFloat(b.value)];
}

function valorDe(raiz: HTMLElement): number | SliderRange {
    const pasos = paradas(raiz);
    if (!esRango(raiz)) return real(pasos, parseFloat(inputs(raiz)[0].value));
    const p = par(raiz);
    return [real(pasos, p[0]), real(pasos, p[1])];
}

export function pintar(raiz: HTMLElement): void {
    const lista = inputs(raiz);
    if (!lista.length) return;
    const min = numero(lista[0], 'min', 0);
    const max = numero(lista[0], 'max', 100);
    const formato = raiz.getAttribute(`${P}slider-format`);
    const pasos = paradas(raiz);
    const conTexto = !!(formato || pasos || raiz.hasAttribute(`${P}slider-valuetext`));
    const campos = pasos ? ocultos(raiz) : [];
    for (const i of lista) if (!anterior.has(i)) anterior.set(i, i.value);

    if (esRango(raiz) && lista.length === 2) {
        const p = par(raiz);
        const riel = raiz.querySelector<HTMLElement>(`[${P}slider-rail]`);
        const { from, to } = computeRangeFill(p, min, max);
        if (riel) setVars(riel, { '--ts-slider-from': `${from}%`, '--ts-slider-to': `${to}%` });
        riel?.classList.toggle('is-top-start', topThumb(p, min, max) === 0);
        lista[0].setAttribute('aria-valuenow', String(real(pasos, p[0])));
        lista[1].setAttribute('aria-valuenow', String(real(pasos, p[1])));
        lista[0].setAttribute('aria-valuemax', String(real(pasos, p[1])));
        lista[1].setAttribute('aria-valuemin', String(real(pasos, p[0])));
        if (conTexto) {
            lista[0].setAttribute('aria-valuetext', dicho(raiz, pasos, p[0]));
            lista[1].setAttribute('aria-valuetext', dicho(raiz, pasos, p[1]));
        }
        campos.forEach((c, k) => (c.value = String(real(pasos, p[k]))));
        const visible = raiz.querySelector(`[${P}slider-value]`);
        if (visible) visible.textContent = joinSliderRange(texto(raiz, pasos, p[0]), texto(raiz, pasos, p[1]));
        return;
    }
    const v = parseFloat(lista[0].value);
    setVars(lista[0], { '--ts-slider-fill': `${computeFillPercent(v, min, max)}%` });
    lista[0].setAttribute('aria-valuenow', String(real(pasos, v)));
    if (conTexto) lista[0].setAttribute('aria-valuetext', dicho(raiz, pasos, v));
    if (campos[0]) campos[0].value = String(real(pasos, v));
    const visible = raiz.querySelector(`[${P}slider-value]`);
    if (visible) visible.textContent = texto(raiz, pasos, v);
}

function aplicar(i: HTMLInputElement, raiz: HTMLElement): void {
    const lista = inputs(raiz);
    const idx = lista.indexOf(i);
    if (esRango(raiz) && lista.length === 2) {
        const hasta = clampThumb(idx as 0 | 1, parseFloat(i.value), crudo(raiz));
        if (String(hasta[idx]) !== i.value) i.value = String(hasta[idx]);
    }
    if (i.value === (anterior.get(i) ?? i.defaultValue)) {
        pintar(raiz);
        return;
    }
    const valor = valorDe(raiz);
    if (!avisar(raiz, { component: 'slider', value: valor, ...(esRango(raiz) ? { index: idx } : {}) })) {
        i.value = anterior.get(i) ?? i.defaultValue;
        pintar(raiz);
        return;
    }
    anterior.set(i, i.value);
    sucias.add(raiz);
    pintar(raiz);
}

export function alEscribir(destino: Element): boolean {
    const i = destino.closest<HTMLInputElement>('input[type="range"]');
    const raiz = i && contenedor(i, 'slider');
    if (!i || !raiz) return false;
    if (soloLectura(i)) {
        i.value = anterior.get(i) ?? i.defaultValue;
        return true;
    }
    aplicar(i, raiz);
    return true;
}

function confirmar(raiz: HTMLElement): void {
    pendientes.delete(raiz);
    if (!sucias.delete(raiz)) return;
    emitir(raiz, 'ts:commit', { component: 'slider', value: valorDe(raiz) });
}

export function alCambiar(destino: Element): void {
    const i = destino.closest<HTMLInputElement>('input[type="range"]');
    const raiz = i && contenedor(i, 'slider');
    if (!i || !raiz || soloLectura(i)) return;
    if (teclaApretada) pendientes.add(raiz);
    else confirmar(raiz);
}

export function alPresionarTecla(destino: Element, tecla: string): boolean {
    const i = destino.closest<HTMLInputElement>('input[type="range"]');
    if (!i || !contenedor(i, 'slider') || !SLIDER_KEYS.includes(tecla)) return false;
    if (soloLectura(i)) return true;
    teclaApretada = true;
    // Con paradas, RePág y AvPág mueven una décima parte de la lista (una parada si hay hasta 14): el salto nativo depende del rango, no de las paradas.
    const raiz = contenedor(i, 'slider');
    const pasos = raiz && paradas(raiz);
    if (!raiz || !pasos || (tecla !== 'PageUp' && tecla !== 'PageDown')) return false;
    const v = Math.min(Math.max(parseFloat(i.value) + (tecla === 'PageUp' ? 1 : -1) * pageStopStep(pasos.length), 0), pasos.length - 1);
    if (esRango(raiz)) moverManija(raiz, inputs(raiz).indexOf(i) as 0 | 1, v);
    else {
        i.value = String(v);
        aplicar(i, raiz);
    }
    pendientes.add(raiz);
    return true;
}

export function alSoltarTecla(destino: Element | null): void {
    teclaApretada = false;
    const raiz = destino?.closest ? contenedor(destino, 'slider') : null;
    if (raiz && pendientes.has(raiz)) confirmar(raiz);
}

function valorDelRiel(raiz: HTMLElement, rail: HTMLElement, e: PointerEvent): number {
    const [a] = inputs(raiz);
    const r = rail.getBoundingClientRect();
    const vertical = raiz.classList.contains('is-vertical');
    const rtl = getComputedStyle(rail).direction === 'rtl';
    const desde = vertical ? r.bottom - e.clientY : rtl ? r.right - e.clientX : e.clientX - r.left;
    const ratio = ratioFromOffset(desde, vertical ? r.height : r.width, SLIDER_THUMB_PX[tamano(raiz)]);
    return valueFromRatio(ratio, numero(a, 'min', 0), numero(a, 'max', 100), numero(a, 'step', 1));
}

function moverManija(raiz: HTMLElement, thumb: 0 | 1, v: number): void {
    const i = inputs(raiz)[thumb];
    const antes = i.value;
    const hasta = clampThumb(thumb, v, crudo(raiz));
    i.value = String(hasta[thumb]);
    if (i.value === antes) return;
    aplicar(i, raiz);
}

export function alPresionarRiel(e: PointerEvent): void {
    const rail = e.target as HTMLElement | null;
    if (!rail?.hasAttribute?.(`${P}slider-rail`) || e.button !== 0) return;
    const raiz = contenedor(rail, 'slider');
    const lista = raiz ? inputs(raiz) : [];
    if (!raiz || lista.length !== 2 || lista[0].disabled || soloLectura(lista[0])) return;
    const v = valorDelRiel(raiz, rail, e);
    const thumb = nearestThumb(par(raiz), v);
    arrastre = { rail, thumb };
    rail.setPointerCapture?.(e.pointerId);
    lista[thumb].focus();
    moverManija(raiz, thumb, v);
    e.preventDefault();
}

export function alMoverRiel(e: PointerEvent): void {
    if (!arrastre) return;
    const raiz = contenedor(arrastre.rail, 'slider');
    if (raiz) moverManija(raiz, arrastre.thumb, valorDelRiel(raiz, arrastre.rail, e));
}

export function alSoltarPuntero(e: Event): void {
    if (arrastre) {
        const { rail } = arrastre;
        arrastre = null;
        const raiz = contenedor(rail, 'slider');
        if (raiz) confirmar(raiz);
        return;
    }
    const destino = e.target as Element | null;
    const raiz = destino?.closest ? contenedor(destino, 'slider') : null;
    if (raiz && !teclaApretada) confirmar(raiz);
}

export function alRestablecer(e: Event): void {
    const form = e.target as Element;
    setTimeout(() => {
        if (e.defaultPrevented) return;
        for (const raiz of form.querySelectorAll<HTMLElement>(`[${P}slider]`)) {
            for (const i of inputs(raiz)) anterior.set(i, i.value);
            pintar(raiz);
        }
    }, 0);
}

export const ficha = {
    alCambiar,
    alEscribir,
    alMoverRiel,
    alPresionarRiel,
    alPresionarTecla,
    alRestablecer,
    alSoltarPuntero,
    alSoltarTecla,
    pintar,
};
