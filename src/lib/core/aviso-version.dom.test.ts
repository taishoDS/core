// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type Modulo = typeof import('./aviso-llave');
let v: Modulo;
let aviso: ReturnType<typeof vi.spyOn>;

const conCss = (version: string | null, lang = '') => {
    document.head.innerHTML = version === null ? '' : `<style>:root { --ts-version: "${version}"; }</style>`;
    document.documentElement.lang = lang;
};

beforeEach(async () => {
    vi.resetModules();
    v = await import('./aviso-llave');
    aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    aviso.mockRestore();
    document.head.innerHTML = '';
    document.documentElement.lang = '';
});

describe('aviso de versiones del CSS y el JS', () => {
    it('lee la versión grabada en el CSS', () => {
        conCss('0.14.0');
        expect(v.versionDelCss(document)).toBe('0.14.0');
    });

    it('con versiones iguales no avisa', () => {
        conCss('0.15.0');
        v.avisarVersiones(document, '0.15.0');
        expect(aviso).not.toHaveBeenCalled();
    });

    it('con versiones distintas avisa en español', () => {
        conCss('0.14.0', 'es-AR');
        v.avisarVersiones(document, '0.15.0');
        expect(aviso).toHaveBeenCalledWith('TaishoDS Core: el CSS es 0.14.0 y el JS es 0.15.0. Los dos tienen que cargarse de la misma versión.');
    });

    it('en una página en inglés avisa en inglés', () => {
        conCss('0.14.0', 'en');
        v.avisarVersiones(document, '0.14.1');
        expect(aviso).toHaveBeenCalledWith('TaishoDS Core: the CSS is 0.14.0 and the JS is 0.14.1. Load both from the same version.');
    });

    it('sin lang en la página avisa en inglés (el respaldo)', () => {
        conCss('0.14.0');
        v.avisarVersiones(document, '0.15.0');
        expect(aviso).toHaveBeenCalledWith('TaishoDS Core: the CSS is 0.14.0 and the JS is 0.15.0. Load both from the same version.');
    });

    it('distingue por patch', () => {
        conCss('1.2.3');
        v.avisarVersiones(document, '1.2.4');
        expect(aviso).toHaveBeenCalledTimes(1);
    });

    it('sin versión en el CSS no avisa', () => {
        conCss(null);
        v.avisarVersiones(document, '0.15.0');
        expect(aviso).not.toHaveBeenCalled();
    });

    it('sin versión en el JS no avisa', () => {
        conCss('0.14.0');
        v.avisarVersiones(document, '');
        expect(aviso).not.toHaveBeenCalled();
    });

    it('avisa una sola vez aunque se arranque de nuevo', () => {
        conCss('0.14.0');
        v.avisarVersiones(document, '0.15.0');
        v.avisarVersiones(document, '0.15.0');
        expect(aviso).toHaveBeenCalledTimes(1);
    });
});

describe('pedirAvisoVersiones: sólo en desarrollo local se pide el módulo', () => {
    it('en un host local pide el módulo y el aviso sale cuando las versiones difieren', async () => {
        const { pedirAvisoVersiones } = await import('./desarrollo-local');
        vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' });
        const cargar = vi.fn(() => Promise.resolve({ avisarVersiones: () => v.avisarVersiones(document, '0.15.0') }));
        conCss('0.14.0', 'es');
        pedirAvisoVersiones(cargar);
        await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1));
        expect(cargar).toHaveBeenCalledTimes(1);
    });

    it('en un host local con versiones iguales pide el módulo y calla', async () => {
        const { pedirAvisoVersiones } = await import('./desarrollo-local');
        vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' });
        const cargar = vi.fn(() => Promise.resolve({ avisarVersiones: () => v.avisarVersiones(document, '0.15.0') }));
        conCss('0.15.0');
        pedirAvisoVersiones(cargar);
        await vi.waitFor(() => expect(cargar).toHaveBeenCalledTimes(1));
        await new Promise((r) => setTimeout(r, 20));
        expect(aviso).not.toHaveBeenCalled();
    });

    it('en producción no pide el módulo ni avisa', async () => {
        const { pedirAvisoVersiones } = await import('./desarrollo-local');
        vi.stubGlobal('location', { protocol: 'https:', hostname: 'taishods.dev' });
        const cargar = vi.fn(() => Promise.resolve({ avisarVersiones: () => v.avisarVersiones(document, '0.15.0') }));
        conCss('0.14.0');
        pedirAvisoVersiones(cargar);
        await new Promise((r) => setTimeout(r, 20));
        expect(cargar).not.toHaveBeenCalled();
        expect(aviso).not.toHaveBeenCalled();
    });

    it('si el módulo no llega no pasa nada: ni error ni aviso', async () => {
        const { pedirAvisoVersiones } = await import('./desarrollo-local');
        vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' });
        const rechazos: unknown[] = [];
        const alRechazar = (e: unknown) => rechazos.push(e);
        process.on('unhandledRejection', alRechazar);
        pedirAvisoVersiones(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
        for (let i = 0; i < 5; i++) await Promise.resolve();
        process.off('unhandledRejection', alRechazar);
        expect(rechazos).toEqual([]);
        expect(aviso).not.toHaveBeenCalled();
    });
});
