// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  keywords?: string;
  icon?: string;
  description?: string;
}

export interface SelectOptionGroup {
  name: string | null;
  options: SelectOption[];
}

export function filterOptions(options: SelectOption[], term: string): SelectOption[] {
  const q = term.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    o => o.label.toLowerCase().includes(q) || (o.keywords?.toLowerCase().includes(q) ?? false),
  );
}

export function toggleValue(selectedValues: string[], optionValue: string): string[] {
  const i = selectedValues.indexOf(optionValue);
  if (i >= 0) {
    return [...selectedValues.slice(0, i), ...selectedValues.slice(i + 1)];
  }
  return [...selectedValues, optionValue];
}

export function formValues(multiple: boolean, selected: string[]): string[] {
  return multiple ? selected : [selected[0] ?? ''];
}

export function requiredProxyValue(selected: string[]): string {
  return selected.join(',');
}

export function getDisplayLabel(
  options: SelectOption[],
  selectedValues: string[],
  placeholder: string,
  multiple: boolean,
  countSuffix: string
): string {
  if (selectedValues.length === 0) return placeholder;
  if (multiple && selectedValues.length > 1) {
    return `${selectedValues.length} ${countSuffix}`;
  }
  const v = selectedValues[0];
  return options.find(o => o.value === v)?.label ?? v;
}

export function edgeIndex(key: string, count: number): number | null {
  if (count === 0) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

export function buildGroups(options: SelectOption[]): SelectOptionGroup[] {
  const result: SelectOptionGroup[] = [];
  const index = new Map<string | null, number>();
  for (const o of options) {
    const g = o.group ?? null;
    if (!index.has(g)) {
      index.set(g, result.length);
      result.push({ name: g, options: [] });
    }
    result[index.get(g)!].options.push(o);
  }
  return result;
}
