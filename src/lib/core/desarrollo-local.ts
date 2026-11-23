// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).

/** Desarrollo local: `localhost`, `127.0.0.1`, `[::1]`, `*.localhost` o un archivo abierto (`file:`). Cualquier otro host es producción. */
export function esDesarrolloLocal(loc: Pick<Location, 'protocol' | 'hostname'>): boolean {
    const host = loc.hostname;
    return loc.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');
}

/**
 * Pide el aviso de la llave `ts` sólo en desarrollo local: en producción no se descarga nada. `cargar` es el `import()` del módulo del
 * aviso (cada forma de entrega lo apunta a su archivo). Si el módulo no llega (sin red, bloqueado), no pasa nada: ni aviso ni error.
 */
export function pedirAvisoLlave(cargar: () => Promise<{ avisarSinLlave: () => void }>): void {
    if (typeof location !== 'undefined' && esDesarrolloLocal(location)) cargar().then((m) => m.avisarSinLlave(), () => {});
}

/** Igual que `pedirAvisoLlave`, para el aviso de versiones distintas entre el CSS y el JS: en producción no se descarga nada. */
export function pedirAvisoVersiones(cargar: () => Promise<{ avisarVersiones: () => void }>): void {
    if (typeof location !== 'undefined' && esDesarrolloLocal(location)) cargar().then((m) => m.avisarVersiones(), () => {});
}
