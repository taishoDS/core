import CargaEfecto from '../carga-efecto';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <CargaEfecto />
    </>
  );
}
