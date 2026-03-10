import { useEffect, useState } from 'react'
import { FileStack, FilePenLine, Trash2, BellRing } from 'lucide-react'
import { useStatsStore } from '../../store/events'
import { fetchStats } from '../../api/events'

interface BackendStats {
	total_monitored: number
	modified_today: number
	deleted_today: number
	alerts_count: number
}

export function HeaderCards() {
	const { totalMonitored, modifiedToday, deletedToday, alerts } = useStatsStore()
	const [backendStats, setBackendStats] = useState<BackendStats | null>(null)

	// Fetch stats from backend
	useEffect(() => {
		async function loadStats() {
			try {
				const stats = await fetchStats()
				setBackendStats(stats)
			} catch (error) {
				console.error('Failed to load stats from backend:', error)
			}
		}

		loadStats()
		// Refresh stats every 5 seconds
		const interval = setInterval(loadStats, 5000)
		return () => clearInterval(interval)
	}, [])

	// Use backend stats if available, otherwise fall back to local store
	const displayStats = backendStats ? {
		total: backendStats.total_monitored,
		modified: backendStats.modified_today,
		deleted: backendStats.deleted_today,
		alerts: backendStats.alerts_count
	} : {
		total: totalMonitored,
		modified: modifiedToday,
		deleted: deletedToday,
		alerts: alerts
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<Card title="Total Files" value={displayStats.total} icon={<FileStack className="h-5 w-5" />} />
			<Card title="Modified Today" value={displayStats.modified} icon={<FilePenLine className="h-5 w-5" />} />
			<Card title="Deleted Today" value={displayStats.deleted} icon={<Trash2 className="h-5 w-5" />} />
			<Card title="Alerts" value={displayStats.alerts} icon={<BellRing className="h-5 w-5" />} />
		</div>
	)
}

function Card({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<div className="flex items-center justify-between">
				<div>
					<div className="text-sm text-muted-foreground">{title}</div>
					<div className="mt-1 text-2xl font-semibold">{value}</div>
				</div>
				<div className="rounded-md bg-secondary p-2 text-secondary-foreground">{icon}</div>
			</div>
		</div>
	)
}

