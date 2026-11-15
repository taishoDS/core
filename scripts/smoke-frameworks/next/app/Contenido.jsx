import Link from 'next/link';

export default function Contenido({ titulo, enlace, texto }) {
  return (
    <>
      <h1 className="ts type-heading-36">{titulo}</h1>
      <Link href={enlace} className="ts link" id="ir-otra">{texto}</Link>
      <button type="button" className="ts button size-md variant-primary" id="abrir-modal" commandfor="confirmar" command="show-modal">
        Invitar a Ana Torres
      </button>

      <dialog id="confirmar" closedby="any" className="ts modal-dialog" aria-labelledby="confirmar-titulo">
        <div className="ts modal size-md">
          <div className="ts modal-header">
            <h2 id="confirmar-titulo" className="ts modal-title">Invitar a Ana Torres al equipo</h2>
          </div>
          <div className="ts modal-body">
            <p className="ts type-copy-14">Va a poder ver y editar los proyectos de Producción y Staging.</p>
          </div>
          <div className="ts modal-footer">
            <button type="button" className="ts button size-md variant-secondary" id="cerrar-modal" commandfor="confirmar" command="close">
              Cancelar
            </button>
            <button type="button" className="ts button size-md variant-primary" commandfor="confirmar" command="close">
              Invitar
            </button>
          </div>
        </div>
      </dialog>
      <div className="ts select-wrapper">
          <span id="ts-select-s1-label" className="ts select-label">Invitar como</span>
          <div className="ts select size-md variant-default" data-ts-listbox="select" data-ts-select="">
            <select
              defaultValue=""
              className="ts select-field appearance-none"
              data-ts-listbox-native=""
              name="invitar-como"
              aria-labelledby="ts-select-s1-label"
            >
              <option value="">Elegir un rol</option>
              <option value="admin" disabled>Admin</option>
              <option value="editor">Editor</option>
              <option value="lector">Lector</option>
                    </select>
            <button
              id="ts-select-s1"
              type="button"
              hidden
              className="ts select-field is-placeholder"
              data-ts-listbox-trigger=""
              role="combobox"
              aria-labelledby="ts-select-s1-label"
              aria-haspopup="listbox"
              aria-expanded="false"
              aria-controls="ts-select-s1-listbox"
            >
              <span
                data-ts-listbox-label=""
                data-ts-placeholder="Elegir un rol"
                data-ts-count-suffix="seleccionados"
                >Elegir un rol</span
              >
            </button>
            <span className="ts select-spinner" data-ts-listbox-spinner="" hidden
              ><span className="ts spinner size-sm" role="status" aria-label="Cargando..."></span
            ></span>
            <input type="hidden" name="invitar-como" value="" disabled data-ts-listbox-value="" />
            <div className="ts select-chevron">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ts icon icon-16"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <div
              id="ts-select-s1-listbox"
              className="ts select-dropdown placement-bottom"
              data-ts-listbox-panel=""
              hidden
              role="listbox"
              aria-label="Invitar como"
              aria-multiselectable="false"
              tabIndex="-1"
            >
              <div className="ts select-loading" data-ts-listbox-loading="" hidden>
                <span className="ts spinner size-sm" role="none" aria-label="" aria-hidden="true"></span>
                <span>Cargando...</span>
              </div>
              <button
                type="button"
                tabIndex="-1"
                className="ts select-option is-disabled"
                role="option"
                data-ts-value="admin"
                aria-selected="false"
                aria-disabled="true"
                disabled
              >
                <span data-select-option-label="">Admin</span></button
              ><button
                id="ts-select-s1-opt-0"
                type="button"
                tabIndex="-1"
                className="ts select-option"
                role="option"
                data-ts-value="editor"
                aria-selected="false"
              >
                <span data-select-option-label="">Editor</span></button
              ><button
                id="ts-select-s1-opt-1"
                type="button"
                tabIndex="-1"
                className="ts select-option"
                role="option"
                data-ts-value="lector"
                aria-selected="false"
              >
                <span data-select-option-label="">Lector</span>
              </button>
            </div>
          </div>
        </div>
    </>
  );
}
