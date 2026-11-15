// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type Modulo = typeof import('./aviso-llave');
let a: Modulo;
let aviso: ReturnType<typeof vi.spyOn>;

const local = { protocol: 'http:', hostname: 'localhost' } as Location;
const en = (hostname: string, protocol = 'https:') => ({ protocol, hostname }) as Location;

const pagina = (html: string, { css = true, lang = '' } = {}) => {
    document.head.innerHTML = css ? '<style>:root { --ts-version: "0.15.0"; }</style>' : '';
    document.body.innerHTML = html;
    document.documentElement.lang = lang;
};

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    a = await import('./aviso-llave');
    aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.useRealTimers();
    aviso.mockRestore();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.documentElement.lang = '';
});

describe('qué es desarrollo local', () => {
    it.each(['localhost', '127.0.0.1', '[::1]', 'app.localhost', 'a.b.localhost'])('%s es local', (h) => {
        expect(a.esDesarrolloLocal(en(h))).toBe(true);
    });
    it('un archivo abierto (file:) es local', () => {
        expect(a.esDesarrolloLocal(en('', 'file:'))).toBe(true);
    });
    it.each(['taishods.dev', 'ejemplo.com', 'localhost.ejemplo.com', 'milocalhost', '192.168.0.10'])('%s no es local', (h) => {
        expect(a.esDesarrolloLocal(en(h))).toBe(false);
    });
});

describe('aviso de la llave `ts`', () => {
    it('con el CSS cargado y ningún `ts` avisa, pasada la espera', () => {
        pagina('<button class="button">Guardar</button>', { lang: 'es-AR' });
        a.avisarSinLlave(document, local);
        expect(aviso).not.toHaveBeenCalled();
        vi.advanceTimersByTime(a.ESPERA_MS);
        expect(aviso).toHaveBeenCalledTimes(1);
        expect(aviso.mock.calls[0][0]).toContain('ningún elemento lleva la llave `ts`');
        expect(aviso.mock.calls[0][0]).toContain('class="ts button"');
    });

    it('en una página en inglés avisa en inglés', () => {
        pagina('<button class="button">Save</button>', { lang: 'en-US' });
        a.avisarSinLlave(document, local);
        vi.advanceTimersByTime(a.ESPERA_MS);
        expect(aviso.mock.calls[0][0]).toContain('no element has the `ts` key');
    });

    it('sin idioma o con otro idioma, el respaldo es el inglés', () => {
        expect(a.textoSinLlave('')).toBe(a.textoSinLlave('fr'));
        expect(a.textoSinLlave('')).toContain('the CSS is loaded');
    });

    it('si hay algún `ts` no avisa', () => {
        pagina('<button class="ts button">Guardar</button>');
        a.avisarSinLlave(document, local);
        vi.advanceTimersByTime(a.ESPERA_MS * 2);
        expect(aviso).not.toHaveBeenCalled();
    });

    it('si el `ts` aparece dentro de la espera no avisa', () => {
        pagina('<div id="app"></div>');
        a.avisarSinLlave(document, local);
        vi.advanceTimersByTime(a.ESPERA_MS - 100);
        document.getElementById('app')!.innerHTML = '<button class="ts button">Guardar</button>';
        vi.advanceTimersByTime(200);
        expect(aviso).not.toHaveBeenCalled();
    });

    it('sin el CSS del Core (sin --ts-version) no avisa', () => {
        pagina('<button class="button">Guardar</button>', { css: false });
        a.avisarSinLlave(document, local);
        vi.advanceTimersByTime(a.ESPERA_MS * 2);
        expect(aviso).not.toHaveBeenCalled();
    });

    it('en un host que no es local (producción) no avisa', () => {
        pagina('<button class="button">Guardar</button>');
        a.avisarSinLlave(document, en('taishods.dev'));
        vi.advanceTimersByTime(a.ESPERA_MS * 2);
        expect(aviso).not.toHaveBeenCalled();
    });

    it('avisa una sola vez aunque se arranque de nuevo', () => {
        pagina('<button class="button">Guardar</button>');
        a.avisarSinLlave(document, local);
        a.avisarSinLlave(document, local);
        vi.advanceTimersByTime(a.ESPERA_MS * 3);
        a.avisarSinLlave(document, local);
        vi.advanceTimersByTime(a.ESPERA_MS * 3);
        expect(aviso).toHaveBeenCalledTimes(1);
    });

    it('con el documento todavía cargando espera al evento load', () => {
        pagina('<button class="button">Guardar</button>');
        const estado = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
        a.avisarSinLlave(document, local);
        vi.advanceTimersByTime(a.ESPERA_MS * 2);
        expect(aviso).not.toHaveBeenCalled();
        window.dispatchEvent(new Event('load'));
        vi.advanceTimersByTime(a.ESPERA_MS);
        expect(aviso).toHaveBeenCalledTimes(1);
        estado.mockRestore();
    });
});

describe('pedirAvisoLlave: sólo en desarrollo local se pide el módulo', () => {
    const cargarFalso = (aviso: () => void = () => {}) => vi.fn(() => Promise.resolve({ avisarSinLlave: aviso }));

    afterEach(() => vi.unstubAllGlobals());

    it('en un host local pide el módulo y llama al aviso', async () => {
        const { pedirAvisoLlave } = await import('./desarrollo-local');
        vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' });
        const llamado = vi.fn();
        const cargar = cargarFalso(llamado);
        pedirAvisoLlave(cargar);
        await Promise.resolve();
        await Promise.resolve();
        expect(cargar).toHaveBeenCalledTimes(1);
        expect(llamado).toHaveBeenCalledTimes(1);
    });

    it('en producción no lo pide', async () => {
        const { pedirAvisoLlave } = await import('./desarrollo-local');
        vi.stubGlobal('location', { protocol: 'https:', hostname: 'taishods.dev' });
        const cargar = cargarFalso();
        pedirAvisoLlave(cargar);
        expect(cargar).not.toHaveBeenCalled();
    });

    it('si el módulo no llega (sin red, bloqueado) no pasa nada: ni error ni aviso', async () => {
        const { pedirAvisoLlave } = await import('./desarrollo-local');
        vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' });
        const rechazos: unknown[] = [];
        const alRechazar = (e: unknown) => rechazos.push(e);
        process.on('unhandledRejection', alRechazar);
        pedirAvisoLlave(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
        for (let i = 0; i < 5; i++) await Promise.resolve();
        process.off('unhandledRejection', alRechazar);
        expect(rechazos).toEqual([]);
        expect(aviso).not.toHaveBeenCalled();
    });
});
