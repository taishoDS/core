'use client';
// El JS del Core toca `document` al cargarse: se importa dentro de un efecto, que corre sólo en el
// navegador y después de la hidratación. Se auto-inicializa y usa delegación de eventos.
import { useEffect } from 'react';

export default function CargaEfecto() {
  useEffect(() => {
    import('../taisho/taisho.core.js');
  }, []);
  return null;
}
