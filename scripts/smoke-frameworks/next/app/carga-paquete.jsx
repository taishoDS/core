'use client';
// Igual que carga-efecto.jsx, pero con el JS tal cual sale del paquete (sin `taisho generate` para el JS).
import { useEffect } from 'react';

export default function CargaPaquete() {
  useEffect(() => {
    import('@taishods/core/core');
  }, []);
  return null;
}
