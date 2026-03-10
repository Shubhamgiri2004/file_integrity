import { cn } from '../../lib/cn'

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'destructive' }) {
	const base = 'inline-flex items-center rounded-md border px-2 py-0.5 text-xs'
	const styles =
		variant === 'destructive'
			? 'border-transparent bg-destructive text-destructive-foreground'
			: 'border-transparent bg-secondary text-secondary-foreground'
	return <span className={cn(base, styles)}>{children}</span>
}

