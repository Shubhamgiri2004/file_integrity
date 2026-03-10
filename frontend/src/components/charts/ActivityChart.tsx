import { useMemo } from 'react'
import { useEventsStore } from '../../store/events'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function ActivityChart() {
	// 🔹 Optimized: Only subscribe to events array reference, not individual events
	// This prevents re-renders when events array reference doesn't change
	const events = useEventsStore((s) => s.events)
	
	// 🔹 Memoized chart data calculation - only recomputes when events array changes
	// This prevents expensive recalculations on every render
	const data = useMemo(() => {
		const buckets = new Map<string, number>()
		for (let i = 9; i >= 0; i--) {
			const d = new Date(Date.now() - i * 60 * 60 * 1000)
			const k = `${d.getHours()}:00`
			buckets.set(k, 0)
		}
		events.forEach((e) => {
			const d = new Date(e.timestamp)
			const k = `${d.getHours()}:00`
			if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + 1)
		})
		return Array.from(buckets.entries()).map(([time, count]) => ({ time, count }))
	}, [events]) // Only recalculate when events array reference changes

	return (
		<div className="rounded-lg border border-border p-4">
			<div className="mb-2 text-sm text-muted-foreground">Activity (last 10h)</div>
			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data}>
						<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
						<XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
						<YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
						<Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
						<Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}

