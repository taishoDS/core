// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { ficha as select, cargando } from '../select';
import { ficha as listbox } from '../listbox';

export const modulos = { select, listbox };
export const api = { setComboboxLoading: cargando, setSelectLoading: cargando };
