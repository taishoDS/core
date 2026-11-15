// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
declare const __TAISHO_CORE_VERSION__: string | undefined;

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

export function avisarVersiones(doc: Document = document, js: string | undefined = VERSION_JS): void {
    if (avisado || !js) return;
    const css = versionDelCss(doc);
    if (!css || css === js) return;
    avisado = true;
    console.warn(textoDeVersiones(css, js, doc.documentElement.lang));
}
