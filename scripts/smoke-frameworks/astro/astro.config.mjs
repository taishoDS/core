import { defineConfig } from 'astro/config';

export default defineConfig({
  // La barra de desarrollo de Astro 6 pide módulos que Vite aún está reoptimizando y llena la consola de
  // errores 504 «Outdated Optimize Dep» (se reproduce sin Taisho): se apaga para que la consola mida sólo al Core.
  devToolbar: { enabled: false },
  vite: {
    // Con Astro 6 en dev, si el JS se importa del paquete (`@taishods/core/core`), Vite reoptimiza dependencias
    // en caliente y la consola muestra los mismos 504: se evita declarándolo.
    optimizeDeps: { include: ['@taishods/core/core'] },
  },
});
