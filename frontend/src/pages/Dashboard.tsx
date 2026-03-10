import { useEffect, useState, useRef } from 'react'
import { HeaderCards } from '../components/dashboard/HeaderCards'
import { EventTable } from '../components/dashboard/EventTable'
import { ActivityChart } from '../components/charts/ActivityChart'
import { useWebSocket } from '../hooks/useWebSocket'
import { useToast } from '../components/notifications/Toaster'
import { useEventsStore, useStatsStore, type FileEvent } from '../store/events'
import { fetchEvents } from '../api/events'
import { useThrottle } from '../hooks/useThrottle'
import { requestNotificationPermission, showFileEventNotification } from '../utils/notifications'

export default function Dashboard() {
	const { toast } = useToast()
	const events = useEventsStore((s) => s.events)
	const addEvent = useEventsStore((s) => s.addEvent)
	const recompute = useStatsStore((s) => s.recompute)
	const [isLoading, setIsLoading] = useState(true)
	
	// 🔹 PERFORMANCE FIX: Throttle recompute to prevent excessive updates
	// When many events arrive quickly (e.g., from rapid file changes), recompute
	// can be called hundreds of times per second, causing:
	// - React "Maximum update depth exceeded" errors
	// - UI freezing and performance degradation
	// - Unnecessary re-renders of charts and components
	//
	// SOLUTION: Throttle recompute to run at most once every 500ms
	// This batches rapid updates and ensures smooth UI performance
	const throttledRecompute = useThrottle((eventsToProcess: FileEvent[]) => {
		recompute(eventsToProcess)
	}, 500)
	
	// 🔹 Track the last processed events array reference to prevent duplicate processing
	// This works together with throttling to ensure we only recompute when events actually change
	const lastProcessedEventsRef = useRef<FileEvent[] | null>(null)

	// 🔹 Request notification permission on mount
	useEffect(() => {
		requestNotificationPermission().catch((error) => {
			console.error('Failed to request notification permission:', error)
		})
	}, [])

	// 🔹 Load initial events on mount
	useEffect(() => {
		async function loadInitialEvents() {
			try {
				const backendEvents = await fetchEvents(100)
				const actionMap: Record<string, 'added' | 'modified' | 'deleted'> = {
					'created': 'added',
					'modified': 'modified',
					'deleted': 'deleted',
					'moved': 'modified' // Treat moved as modified for folders
				}

				const frontendEvents: FileEvent[] = backendEvents.map((e) => {
					const filePath = e.file_path || e.filename
					const isFolder = (e as any).is_folder === true
					const folderPrefix = isFolder ? '[Folder] ' : ''
					const displayPath = e.parent_folder
						? `${folderPrefix}[${e.parent_folder}] ${filePath}`
						: `${folderPrefix}${filePath}`

					return {
						id: crypto.randomUUID(),
						filePath: displayPath,
						action: actionMap[e.event] || 'modified',
						timestamp: new Date(e.timestamp).getTime(),
						status: 'ok'
					}
				})

				// Add events (oldest first)
				frontendEvents.reverse().forEach((e) => addEvent(e))
			} catch (error) {
				console.error('Failed to load initial events:', error)
				toast('Warning', 'Could not load events from backend. Make sure the backend is running.')
			} finally {
				setIsLoading(false)
			}
		}

		loadInitialEvents()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Only run once on mount - addEvent and toast are stable

	// 🔹 FIXED: Throttled recompute that only runs when events actually change
	// This prevents infinite loops and performance issues by:
	// 1. Comparing array reference to detect real changes (not just re-renders)
	// 2. Throttling recompute calls to at most once every 500ms
	// 3. Storing the processed array reference in a ref (doesn't cause re-renders)
	// 4. Batching rapid updates together for smooth UI performance
	useEffect(() => {
		// Only recompute if:
		// - We have events
		// - The events array reference is different from what we last processed
		// The throttled function will batch rapid calls together
		if (events.length > 0 && events !== lastProcessedEventsRef.current) {
			throttledRecompute(events)
			lastProcessedEventsRef.current = events
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [events]) // Depend on events array reference - only changes when events actually change

	// 🔹 Connect to WebSocket for real-time updates
	useWebSocket((e) => {
		// Show in-app toast notification
		toast(`${e.action.toUpperCase()} - ${e.filePath}`, new Date(e.timestamp).toLocaleString())
		
		// Show browser desktop notification
		const fileName = e.filePath.split(/[/\\]/).pop() || e.filePath
		showFileEventNotification(fileName, e.action, e.timestamp)
	})

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-muted-foreground">Loading events...</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<HeaderCards />
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2">
					<h2 className="mb-2 text-sm text-muted-foreground">Recent Events</h2>
					<EventTable limit={15} />
				</div>
				<div>
					<ActivityChart />
				</div>
			</div>
		</div>
	)
}
