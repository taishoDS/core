// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type * as Accordion from './accordion';
import type * as AlertDialog from './alert-dialog';
import type * as Avatar from './avatar';
import type * as Button from './button';
import type * as Campo from './campo';
import type * as Clear from './clear';
import type * as Clipboard from './clipboard';
import type * as CommandPalette from './command-palette';
import type * as DatePicker from './date-picker';
import type * as Dismiss from './dismiss';
import type * as FileUpload from './file-upload';
import type * as Invokers from './invokers';
import type * as Listbox from './listbox';
import type * as Medidas from './medidas';
import type * as Menu from './menu';
import type * as NumberInput from './number-input';
import type * as Opcion from './opcion';
import type * as Overlays from './overlays';
import type * as Pagination from './pagination';
import type * as Progress from './progress';
import type * as Scrollspy from './scrollspy';
import type * as Segmented from './segmented';
import type * as Select from './select';
import type * as Sidebar from './sidebar';
import type * as Slider from './slider';
import type * as Spotlight from './spotlight';
import type * as Table from './table';
import type * as Tabs from './tabs';
import type * as Toast from './toast';
import type * as Toggle from './toggle';

export interface Modulos {
    accordion: typeof Accordion.ficha;
    alertDialog: typeof AlertDialog.ficha;
    avatar: typeof Avatar.ficha;
    button: typeof Button.ficha;
    campo: typeof Campo.ficha;
    clear: typeof Clear.ficha;
    clipboard: typeof Clipboard.ficha;
    commandPalette: typeof CommandPalette.ficha;
    datePicker: typeof DatePicker.ficha;
    dismiss: typeof Dismiss.ficha;
    fileUpload: typeof FileUpload.ficha;
    invokers: typeof Invokers.ficha;
    listbox: typeof Listbox.ficha;
    medidas: typeof Medidas.ficha;
    menu: typeof Menu.ficha;
    numberInput: typeof NumberInput.ficha;
    opcion: typeof Opcion.ficha;
    overlays: typeof Overlays.ficha;
    pagination: typeof Pagination.ficha;
    progress: typeof Progress.ficha;
    scrollspy: typeof Scrollspy.ficha;
    segmented: typeof Segmented.ficha;
    select: typeof Select.ficha;
    sidebar: typeof Sidebar.ficha;
    slider: typeof Slider.ficha;
    spotlight: typeof Spotlight.ficha;
    table: typeof Table.ficha;
    tabs: typeof Tabs.ficha;
    toast: typeof Toast.ficha;
    toggle: typeof Toggle.ficha;
}

export const cargador: { diferirClick?: (destino: Element) => boolean } = {};

export const m: Partial<Modulos> = {};
