'use client';
// El camino ingenuo: un import estático arriba de todo. Un componente de cliente también se
// evalúa en el servidor al prerenderizar, y el Core toca `document` al cargarse.
import '../taisho/taisho.core.js';

export default function CargaDirecta() {
  return null;
}
