# Política de seguridad

## Cómo reportar una vulnerabilidad

Las vulnerabilidades se reportan en privado, con el reporte privado de vulnerabilidades de GitHub:

1. Ir a la pestaña **Security** de este repositorio.
2. Elegir **Report a vulnerability**.
3. Describir el problema, los pasos para reproducirlo y la versión afectada.

No se deben abrir issues públicos ni pull requests con detalles de una vulnerabilidad que todavía no tenga arreglo.

## Qué esperar

El proyecto tiene un solo mantenedor. Se intenta acusar recibo en 7 días y, si el reporte se confirma, publicar un arreglo y un aviso de seguridad coordinado con quien lo reportó. No hay recompensas económicas.

## Versiones con soporte

Sólo la última versión publicada en npm de `@taishods/core` recibe arreglos de seguridad.

## Alcance

Entra en alcance el código de este repositorio y el paquete `@taishods/core`: el CSS generado, el JavaScript de comportamiento, el comando `taisho` y el plugin de Vite. Un problema en una dependencia de terceros se reporta a su proyecto; si afecta a este paquete, también se agradece el aviso acá.
