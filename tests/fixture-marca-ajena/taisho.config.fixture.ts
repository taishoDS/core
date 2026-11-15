/**
 * Fixture de QA para la Entrega B — un `TaishoConfig` de una marca AJENA a
 * TaishoDS (nada que ver con `taisho`/`ocean`/`cozy` de `src/config/`), armado
 * SOLO con lo que expone la API pública (`src/generate/index.ts`). Prueba que
 * un consumidor externo puede compilar SU marca sin tocar nuestras fuentes.
 *
 * Semilla de marca: violeta profundo (#6D28D9), muy lejos de los azules/limas/
 * ámbares de nuestros temas — para que sea imposible confundir su CSS con el
 * nuestro por accidente.
 */
import type { TaishoConfig, ThemeDef } from '../../src/generate';

export const MARCA_AJENA_BRAND_HEX = '#6D28D9';

const tema: ThemeDef = {
    colors: {
        brand: MARCA_AJENA_BRAND_HEX,
        'brand-secondary': '#059669',
        accent: '#DB2777',
    },
};

export const marcaAjenaConfig: TaishoConfig = {
    themes: {
        principal: tema,
    },
    fontFaces: [
        { source: '@fontsource/nunito', subsets: ['latin'], weights: [400, 700] },
    ],
    fonts: {
        sans: '"Nunito", ui-sans-serif, system-ui, sans-serif',
    },
    defaultStates: {
        success: '#15803D',
        warning: '#B45309',
        info: '#1D4ED8',
        danger: '#B91C1C',
    },
};

// Default export: convención que espera `taisho generate` al cargar un
// `taisho.config.ts` de consumidor.
export default marcaAjenaConfig;
