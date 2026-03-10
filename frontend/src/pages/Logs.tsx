import { useState, useMemo, useEffect } from 'react'
import { useEventsStore } from '../store/events'
import { exportEventsToCSV } from '../utils/export'
import { Download } from 'lucide-react'

export default function Logs() {
	const events = useEventsStore((s) => s.events)
	const [page, setPage] = useState(1)
	const [action, setAction] = useState<'all' | 'added' | 'modified' | 'deleted'>('all')
	const [date, setDate] = useState<string>('')

	const pageSize = 20
	const filtered = useMemo(() => {
		return events.filter((e) => {
			const okAction = action === 'all' || e.action === action
			const okDate = !date || new Date(e.timestamp).toISOString().slice(0, 10) === date
			return okAction && okDate
		})
	}, [events, action, date])

	// Reset to page 1 when filters change
	useEffect(() => {
		setPage(1)
	}, [action, date])

	const start = (page - 1) * pageSize
	const pageItems = filtered.slice(start, start + pageSize)
	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

	const handleExport = () => {
		try {
			const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
			const filename = `file-integrity-events-${timestamp}.csv`
			exportEventsToCSV(filtered, filename)
		} catch (error) {
			console.error('Failed to export events:', error)
			alert('Failed to export events. Please try again.')
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2 justify-between">
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={action}
						onChange={(e) => setAction(e.target.value as 'all' | 'added' | 'modified' | 'deleted')}
						className="rounded-md border border-border bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Actions</option>
						<option value="added">Added</option>
						<option value="modified">Modified</option>
						<option value="deleted">Deleted</option>
					</select>
					<input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="rounded-md border border-border bg-background px-3 py-2 text-sm"
					/>
				</div>
				{filtered.length > 0 && (
					<button
						onClick={handleExport}
						className="flex items-center gap-2 rounded-md border border-border bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
					>
						<Download className="w-4 h-4" />
						Export CSV ({filtered.length} events)
					</button>
				)}
			</div>
			<div className="rounded-lg border border-border overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-muted/50">
						<tr>
							<th className="text-left p-3 font-medium">File</th>
							<th className="text-left p-3 font-medium">Action</th>
							<th className="text-left p-3 font-medium">Timestamp</th>
						</tr>
					</thead>
					<tbody>
						{pageItems.length === 0 ? (
							<tr>
								<td colSpan={3} className="p-8 text-center text-muted-foreground">
									No events found matching your filters.
								</td>
							</tr>
						) : (
							pageItems.map((e) => (
								<tr key={e.id} className="border-t border-border">
									<td className="p-3 font-mono text-xs md:text-sm">{e.filePath}</td>
									<td className="p-3 capitalize">{e.action}</td>
									<td className="p-3">{new Date(e.timestamp).toLocaleString()}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			{filtered.length > 0 && (
				<div className="flex items-center justify-between">
					<button
						disabled={page === 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						className="rounded-md border border-border bg-card px-3 py-2 text-sm disabled:opacity-50 hover:bg-accent"
					>
						Previous
					</button>
					<div className="text-sm text-muted-foreground">
						Page {page} of {totalPages} ({filtered.length} total)
					</div>
					<button
						disabled={page === totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						className="rounded-md border border-border bg-card px-3 py-2 text-sm disabled:opacity-50 hover:bg-accent"
					>
						Next
					</button>
				</div>
			)}
		</div>
	)
}

