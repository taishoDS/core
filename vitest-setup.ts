import { expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';

// Matchers de accesibilidad (toHaveNoViolations) y de DOM (jest-dom).
expect.extend(axeMatchers);

// jsdom no implementa la Web Animations API que usan las transiciones de Svelte
// (fade/scale/fly) ni `animate:flip` (getAnimations). Stubs mínimos.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.animate) {
    Element.prototype.animate = function () {
      const anim: Record<string, unknown> = {
        cancel() {}, finish() {}, play() {}, pause() {},
        commitStyles() {}, persist() {},
        addEventListener() {}, removeEventListener() {},
        finished: Promise.resolve(),
        onfinish: null,
        currentTime: 0,
        playState: 'finished',
      };
      // Svelte asigna `onfinish` después de crear la animación y espera que se
      // invoque para completar la transición de SALIDA (y desmontar el nodo).
      setTimeout(() => (anim.onfinish as (() => void) | null)?.(), 0);
      return anim as unknown as Animation;
    };
  }
  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

// jsdom no implementa la Pointer Capture API (la usan los gestos de arrastre:
// `setPointerCapture`/`releasePointerCapture` sobre el elemento donde arrancó el gesto).
// Stubs no-op — el mismo criterio que `animate` arriba.
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = function () {};
  HTMLElement.prototype.releasePointerCapture = function () {};
  HTMLElement.prototype.hasPointerCapture = () => false;
}

// jsdom no implementa `document.elementFromPoint` (no hay layout real): sin esto ni
// `vi.spyOn(document, 'elementFromPoint')` funciona en los tests (spyOn exige que la
// propiedad ya exista). Default `null` — los tests de arrastre lo mockean por
// test con el elemento real que corresponde a cada punto simulado.
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

// jsdom no implementa ResizeObserver (lo usa la virtualización de Table para
// medir el viewport). Stub no-op: los callbacks nunca disparan (sin layout).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom no implementa canvas y loguea "Not implemented: getContext()" en cada
// test que lo toque (ej. axe midiendo contraste). Stub silencioso.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}

// jsdom no implementa la API de <dialog> (showModal/close/cancel). Stub mínimo
// que refleja `open` y dispara los eventos que consumen los componentes
// (Modal/Drawer usan <dialog> nativo desde Fase 4). Escape → 'cancel'+'close'.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.show = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function (returnValue?: string) {
    if (!this.open) return;
    this.open = false;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}

// La Popover API de jsdom está a medias: aplica `display:none` al popover cerrado
// (regla UA) pero `showPopover()` es un no-op que NO abre el elemento, así que el
// popover quedaría invisible para el árbol de accesibilidad (findByRole no lo
// encuentra). En vez de emular el estado interno de jsdom, mapeamos el marcador
// de "mostrado" del propio componente (`.is-visible`, que solo existe mientras el
// tooltip está en el DOM) a display:block — una regla de autor que jsdom SÍ aplica
// en getComputedStyle y que sobrevive a los re-render de Svelte (Fase 4).
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
  HTMLElement.prototype.togglePopover = function () { return true; };
}
if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  // El Menu del Core (popover="manual", top-layer) marca "abierto" quitando `hidden` del panel:
  // sin esta regla jsdom no deja enfocar sus ítems (2026-11-03). Igual el contenedor de los avisos
  // (popover="manual" abierto por código): `showPopover()` no abre nada acá y sus botones quedarían ocultos.
  s.textContent =
    '[popover].is-visible, [popover][data-ts-menu-panel]:not([hidden]), [popover][data-ts-toast-container] { display: block !important; }';
  document.head.appendChild(s);
}

// jsdom no implementa matchMedia. Stub que reporta SIN match (default realista);
// las transiciones se completan igual al instante por el stub de `animate` de arriba.
// (No forzamos reduced-motion acá para no romper los tests de motion.ts.)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom no implementa Constructable Stylesheets: `new CSSStyleSheet()` tira
// "Illegal constructor" y `document.adoptedStyleSheets` no existe. Lo usa
// createTheme.ts (runtime theming del Theme Studio y el hero de la home).
// Stub mínimo: guarda las reglas en memoria, no las aplica al render (jsdom no
// lee `adoptedStyleSheets` en getComputedStyle) — alcanza para que la lógica de
// createTheme/clearTheme corra sin tirar, que es lo que testean los `.dom.test.ts`.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!('adoptedStyleSheets' in document)) {
    (document as unknown as { adoptedStyleSheets: unknown[] }).adoptedStyleSheets = [];
  }
  const CSSStyleSheetCtor = (window as unknown as { CSSStyleSheet?: new () => unknown }).CSSStyleSheet;
  let needsStub = !CSSStyleSheetCtor;
  if (CSSStyleSheetCtor) {
    try {
      new CSSStyleSheetCtor();
    } catch {
      needsStub = true;
    }
  }
  if (needsStub) {
    class StubCSSStyleSheet {
      cssText = '';
      replaceSync(text: string) {
        this.cssText = text;
      }
    }
    (window as unknown as { CSSStyleSheet: unknown }).CSSStyleSheet = StubCSSStyleSheet;
    (globalThis as unknown as { CSSStyleSheet: unknown }).CSSStyleSheet = StubCSSStyleSheet;
  }
}

