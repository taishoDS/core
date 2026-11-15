import { twMerge } from 'tailwind-merge';

type Props = { vacia?: boolean; className?: string };

export function Lista({ vacia, className }: Props) {
	const estado = vacia ? 'text-gray-500 italic' : 'text-gray-900';
	return (
		<ul className={twMerge('flex flex-col gap-2 p-4', estado, className)} role="list" data-kind="lista">
			<li className="rounded border border-gray-300 px-2 py-1">Uno</li>
			<li className="truncate sm:flex 2xl:hidden">Dos</li>
		</ul>
	);
}
