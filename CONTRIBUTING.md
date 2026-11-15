# Contribuir a TaishoDS Core

Las contribuciones son bienvenidas: reportes de errores, mejoras a la documentación y arreglos con su prueba.

## Poner el proyecto en marcha

Requiere Node 22.18 o más nuevo.

```bash
npm ci
npm run generate        # genera el CSS, los tokens y los tipos
npm test                # pruebas unitarias
npm run test:core-package   # arma el paquete, lo instala en un proyecto limpio y lo prueba
```

Antes de abrir un pull request tienen que pasar `npm test` y `npm run test:core-package`. Los mismos pasos corren en CI.

## Issues

Un issue con título claro, versión del paquete, navegador y sistema, y un ejemplo mínimo que reproduzca el problema. Una vulnerabilidad no va en un issue: ver `SECURITY.md`.

## Pull requests

- Un cambio por pull request, con una prueba que falle sin el cambio.
- Para una funcionalidad nueva o un cambio de la API pública, abrir antes un issue y acordar el enfoque: evita trabajo que no se pueda aceptar.
- Los archivos de CSS generados no se editan a mano; se cambia el origen y se corre `npm run generate`.
- Mensajes de commit breves, en el estilo de los existentes.

Al contribuir se acepta que el aporte se publique bajo la licencia MIT del proyecto. El nombre y la identidad visual de Taisho quedan fuera de esa licencia (ver `TRADEMARK.md`).
