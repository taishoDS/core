import cn from 'classnames';

export function Boton({ primario, children }) {
	const base = 'inline-flex items-center gap-2 rounded-md px-4 py-2';
	return (
		<button type="submit" className={cn(base, primario ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-800', 'focus-visible:opacity-50')}>
			{children}
		</button>
	);
}

export function Fila({ n }) {
	const el = document.createElement('div');
	el.classList.add('p-4', 'flex');
	return <li className={`flex p-${n} gap-2`}>fila</li>;
}
