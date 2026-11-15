import CargaDirecta from '../carga-directa';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <CargaDirecta />
    </>
  );
}
