// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { ficha as accordion } from './accordion';
import { ficha as alertDialog } from './alert-dialog';
import { ficha as avatar } from './avatar';
import { ficha as clear } from './clear';
import { ficha as clipboard } from './clipboard';
import { ficha as commandPalette } from './command-palette';
import { ficha as datePicker } from './date-picker';
import { ficha as dismiss } from './dismiss';
import { ficha as fileUpload } from './file-upload';
import { ficha as invokers } from './invokers';
import { ficha as listbox } from './listbox';
import { ficha as medidas } from './medidas';
import { ficha as menu } from './menu';
import { ficha as numberInput } from './number-input';
import { ficha as opcion } from './opcion';
import { ficha as overlays } from './overlays';
import { ficha as pagination } from './pagination';
import { ficha as progress } from './progress';
import { ficha as scrollspy } from './scrollspy';
import { ficha as segmented } from './segmented';
import { ficha as select } from './select';
import { ficha as sidebar } from './sidebar';
import { ficha as slider } from './slider';
import { ficha as spotlight } from './spotlight';
import { ficha as table } from './table';
import { ficha as tabs } from './tabs';
import { ficha as button } from './button';
import { ficha as campo } from './campo';
import { ficha as avisos } from './toast';
import { ficha as toggle } from './toggle';
import { iniciar } from './nucleo';
import { m } from './registro';

export { nextIndex } from './roving';
export { setTexts } from './textos';
export type { CoreTexts } from './textos';
export type { RovingKey, RovingOpciones } from './roving';
export type { TsChangeDetail, TsCommitDetail, TsDebouncedInputDetail, TsEventMap } from './eventos';
export { toast, updateToast, clearToasts } from './toast';
export type { ToastOptions, ToastVariant, ToastAction, ToastChanges, ToastPromiseMessages } from './toast';
export { cargando as setComboboxLoading, cargando as setSelectLoading } from './select';
export { cargando as setNumberInputLoading } from './number-input';
export { cargando as setDatePickerLoading, deshabilitar as setDatePickerDisabledDate } from './date-picker';
export { cargando as setTextareaLoading, cargando as setInputLoading } from './campo';
export { cargando as setButtonLoading } from './button';
export { markInvalid, clearInvalid } from './invalid';

const TODOS = {
    accordion,
    alertDialog,
    avatar,
    button,
    clear,
    clipboard,
    commandPalette,
    datePicker,
    dismiss,
    fileUpload,
    invokers,
    listbox,
    medidas,
    menu,
    numberInput,
    opcion,
    overlays,
    pagination,
    progress,
    scrollspy,
    segmented,
    select,
    sidebar,
    slider,
    spotlight,
    table,
    tabs,
    campo,
    toast: avisos,
    toggle,
};

export function init(root: Document | HTMLElement = document): Promise<void> {
    Object.assign(m, TODOS);
    iniciar(root);
    return Promise.resolve();
}

