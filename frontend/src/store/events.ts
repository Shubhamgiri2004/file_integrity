import { create } from 'zustand'

export type FileAction = 'added' | 'modified' | 'deleted'

export interface FileEvent {
	id: string
	filePath: string
	action: FileAction
	timestamp: number
	status: 'ok' | 'alert'
}

interface SettingsState {
	realtime: boolean
	monitoredPath: string
	setRealtime: (v: boolean) => void
	setMonitoredPath: (p: string) => void
}

interface EventsState {
	events: FileEvent[]
	addEvent: (e: FileEvent) => void
	clear: () => void
}

interface StatsState {
	totalMonitored: number
	modifiedToday: number
	deletedToday: number
	alerts: number
	recompute: (events: FileEvent[]) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
	realtime: true,
	monitoredPath: './watched_folder',
	setRealtime: (v) => set({ realtime: v }),
	setMonitoredPath: (p) => set({ monitoredPath: p }),
}))

export const useEventsStore = create<EventsState>((set) => ({
	events: [],
	addEvent: (e) => set((s) => {
		// 🔹 FIX: Prevent duplicate events - check if identical event already exists
		// An event is considered duplicate if it has the same filePath and action
		// and occurred within 500ms of an existing event (only true duplicates)
		// Backend already handles most deduplication, this is a safety net
		const isDuplicate = s.events.some((existing) => {
			const sameFileAndAction = existing.filePath === e.filePath && existing.action === e.action
			const timeDiff = Math.abs(existing.timestamp - e.timestamp)
			// Only block if it's the exact same event within 500ms (true duplicate)
			// Allow events that are more than 500ms apart (legitimate repeated actions)
			return sameFileAndAction && timeDiff < 500
		})
		
		if (isDuplicate) {
			// Don't add duplicate event - backend should have caught this, but safety check
			console.debug('Frontend: Duplicate event suppressed', e.filePath, e.action)
			return s
		}
		
		// Add new event to the beginning of the array
		return { events: [e, ...s.events].slice(0, 5000) }
	}),
	clear: () => set({ events: [] }),
}))

export const useStatsStore = create<StatsState>((set) => ({
	totalMonitored: 0,
	modifiedToday: 0,
	deletedToday: 0,
	alerts: 0,
	recompute: (events) =>
		set(() => {
			const today = new Date()
			today.setHours(0, 0, 0, 0)
			const start = today.getTime()
			const modifiedToday = events.filter((e) => e.action === 'modified' && e.timestamp >= start).length
			const deletedToday = events.filter((e) => e.action === 'deleted' && e.timestamp >= start).length
			const alerts = events.filter((e) => e.status === 'alert').length
			return { totalMonitored: 256, modifiedToday, deletedToday, alerts }
		}),
}))

