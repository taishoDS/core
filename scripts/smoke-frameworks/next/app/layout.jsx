// Componente de servidor: el CSS que dejó `taisho generate` va acá; el JS no (ver cada carga).
// `data-scroll-behavior`: el reset del Core pone `scroll-behavior: smooth` en <html> y Next avisa en consola.
import '../taisho/fonts.css';
import '../taisho/theme.css';
import '../taisho/taisho.css';

export const metadata = { title: 'Smoke Next' };

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className="ts flex flex-col items-start gap-base p-double">{children}</body>
    </html>
  );
}
