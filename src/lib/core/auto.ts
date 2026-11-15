// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Entrypoint del Core: todo lo de `./base` (la base y los módulos a pedido), **y se inicializa solo**.
 *
 * Es lo que se empaqueta como `taisho.core.js`: se pega el `<script type="module">` y funciona. Al importarlo,
 * el Core queda cableado sobre todo el `document`.
 */
import { init } from './base';

export * from './base';

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }
}
