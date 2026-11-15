import CargaPaquete from '../carga-paquete';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <CargaPaquete />
    </>
  );
}
