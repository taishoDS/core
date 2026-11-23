// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { esDesarrolloLocal } from './desarrollo-local';

declare const __TAISHO_CORE_VERSION__: string | undefined;

export { esDesarrolloLocal };

export const VERSION_JS: string | undefined = typeof __TAISHO_CORE_VERSION__ === 'undefined' ? undefined : __TAISHO_CORE_VERSION__;

let avisado = false;

export function versionDelCss(doc: Document): string | undefined {
    const valor = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue('--ts-version').trim().replace(/^["']|["']$/g, '');
    return valor || undefined;
}

export function textoDeVersiones(css: string, js: string, lang: string): string {
    return lang.toLowerCase().startsWith('es')
        ? `TaishoDS Core: el CSS es ${css} y el JS es ${js}. Los dos tienen que cargarse de la misma versión.`
        : `TaishoDS Core: the CSS is ${css} and the JS is ${js}. Load both from the same version.`;
}

/** En desarrollo local, avisa una sola vez en consola si el CSS y el JS del Core son de versiones distintas. */
export function avisarVersiones(doc: Document = document, js: string | undefined = VERSION_JS): void {
    if (avisado || !js) return;
    const css = versionDelCss(doc);
    if (!css || css === js) return;
    avisado = true;
    console.warn(textoDeVersiones(css, js, doc.documentElement.lang));
}

/** Tras la carga del documento, lo que se espera a que algo escriba la llave `ts` (una página que arma su contenido después). */
export const ESPERA_MS = 2000;

let programado = false;

export function textoSinLlave(lang: string): string {
    return lang.toLowerCase().startsWith('es')
        ? 'TaishoDS Core: el CSS está cargado, pero ningún elemento lleva la llave `ts`. Los estilos sólo se aplican en elementos con `ts` en su `class` (por ejemplo, `class="ts button"`).'
        : 'TaishoDS Core: the CSS is loaded, but no element has the `ts` key. Styles only apply on elements with `ts` in their `class` (for example, `class="ts button"`).';
}

/**
 * En desarrollo local, con el CSS del Core cargado y ningún elemento con la llave `ts`, avisa una sola vez en consola.
 * Espera a que cargue el documento y después `espera` ms: si en ese lapso aparece algún `ts`, no avisa.
 */
export function avisarSinLlave(doc: Document = document, loc: Location = location, espera = ESPERA_MS): void {
    if (programado || !esDesarrolloLocal(loc)) return;
    programado = true;
    const revisar = () =>
        setTimeout(() => {
            if (versionDelCss(doc) && !doc.querySelector('.ts')) console.warn(textoSinLlave(doc.documentElement.lang));
        }, espera);
    if (doc.readyState === 'complete') revisar();
    else doc.defaultView?.addEventListener('load', revisar, { once: true });
}

const sinNombre = new WeakSet<Element>();

/** Avisa, una sola vez por diálogo, de los que no tienen nombre accesible. Sólo en `localhost`, `127.0.0.1` y `[::1]`. */
export function revisarNombres(raiz: Document | HTMLElement): void {
    const doc = raiz.ownerDocument ?? (raiz as Document);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(doc.location?.hostname ?? '')) return;
    for (const dialogo of raiz.querySelectorAll<HTMLElement>('dialog.ts')) {
        if (sinNombre.has(dialogo) || dialogo.hasAttribute('aria-label') || dialogo.hasAttribute('aria-labelledby') || dialogo.hasAttribute('title')) continue;
        sinNombre.add(dialogo);
        const en = doc.documentElement.lang.toLowerCase().startsWith('en');
        console.warn(
            en
                ? 'TaishoDS Core: a dialog has no accessible name. It needs aria-labelledby (pointing to its title) or aria-label.'
                : 'TaishoDS Core: un diálogo no tiene nombre accesible. Falta aria-labelledby (que apunte a su título) o aria-label.',
            dialogo,
        );
    }
}
