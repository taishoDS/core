// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  group?: string;
  shortcut?: string[];
  keywords?: string[];
  disabled?: boolean;
  action: () => void;
}

export function filterItems(items: CommandItem[], query: string): CommandItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase().trim();
  return items
    .map((item) => {
      const labelScore = item.label.toLowerCase().includes(q) ? 3 : 0;
      const kwScore = item.keywords?.some((k) => k.toLowerCase().includes(q)) ? 2 : 0;
      const descScore = item.description?.toLowerCase().includes(q) ? 1 : 0;
      return { item, score: labelScore + kwScore + descScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

export type CommandKeyAction = 'next' | 'prev' | 'choose' | 'close';

export function commandKeyAction(key: string): CommandKeyAction | null {
  switch (key) {
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'prev';
    case 'Enter':
      return 'choose';
    case 'Escape':
      return 'close';
    default:
      return null;
  }
}
