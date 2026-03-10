import { useEffect, useRef } from 'react'
import { useEventsStore, useSettingsStore, type FileEvent, type FileAction } from '../store/events'

const files = [
	"/var/log/auth.log",
	"/etc/ssh/sshd_config",
	"/home/user/docs/report.docx",
	"/opt/app/config.yaml",
	"/tmp/cache/index.db",
]

function randomEvent(): FileEvent {
	const action: FileAction = (['added', 'modified', 'deleted'] as const)[Math.floor(Math.random() * 3)]
	const filePath = files[Math.floor(Math.random() * files.length)]
	return {
		id: crypto.randomUUID(),
		filePath,
		action,
		timestamp: Date.now(),
		status: Math.random() < 0.15 ? 'alert' : 'ok',
	}
}

export function useMockWebSocket(onEvent?: (e: FileEvent) => void) {
	const addEvent = useEventsStore((s) => s.addEvent)
	const realtime = useSettingsStore((s) => s.realtime)
	const timer = useRef<number | null>(null)

	useEffect(() => {
		if (!realtime) {
			if (timer.current) window.clearInterval(timer.current)
			return
		}
		timer.current = window.setInterval(() => {
			const e = randomEvent()
			addEvent(e)
			onEvent?.(e)
		}, 5000)
		return () => {
			if (timer.current) window.clearInterval(timer.current)
		}
	}, [realtime, addEvent, onEvent])
}

