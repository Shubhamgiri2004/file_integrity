import { useEventsStore, type FileEvent } from '../../store/events'
import { Badge } from '../ui/Badge'

export function EventTable({ limit = 10 }: { limit?: number }) {
	const events = useEventsStore((s) => s.events).slice(0, limit)
	return (
		<div className="rounded-lg border border-border overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/50">
					<tr>
						<th className="text-left p-3 font-medium">File</th>
						<th className="text-left p-3 font-medium">Action</th>
						<th className="text-left p-3 font-medium">Timestamp</th>
						<th className="text-left p-3 font-medium">Status</th>
					</tr>
				</thead>
				<tbody>
					{events.length === 0 ? (
						<tr>
							<td colSpan={4} className="p-8 text-center text-muted-foreground">
								No events yet. Waiting for file changes...
							</td>
						</tr>
					) : (
						events.map((e) => (
							<tr key={e.id} className="border-t border-border">
								<td className="p-3 font-mono text-xs md:text-sm">{e.filePath}</td>
								<td className="p-3"><ActionBadge action={e.action} /></td>
								<td className="p-3">{new Date(e.timestamp).toLocaleString()}</td>
								<td className="p-3">{e.status === 'ok' ? <Badge>OK</Badge> : <Badge variant="destructive">Alert</Badge>}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	)
}

function ActionBadge({ action }: { action: FileEvent['action'] }) {
	const v =
		action === 'added' ? { label: 'Added', c: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' } :
		action === 'modified' ? { label: 'Modified', c: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' } :
		{ label: 'Deleted', c: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' }
	return <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${v.c}`}>{v.label}</span>
}

