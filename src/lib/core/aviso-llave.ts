// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { versionDelCss } from './version';
import { esDesarrolloLocal } from './desarrollo-local';

export { esDesarrolloLocal };

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
