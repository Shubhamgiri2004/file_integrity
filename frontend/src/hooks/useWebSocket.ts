import { useEffect, useRef } from 'react'
import { useEventsStore, useSettingsStore, type FileEvent } from '../store/events'

const WS_URL = 'ws://localhost:8000/ws'

export function useWebSocket(onEvent?: (e: FileEvent) => void) {
	const addEvent = useEventsStore((s) => s.addEvent)
	const realtime = useSettingsStore((s) => s.realtime)
	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<number | null>(null)
	const isConnectingRef = useRef<boolean>(false)
	
	// 🔹 Use refs for callbacks to prevent re-creating WebSocket on every render
	// This ensures the effect only runs when `realtime` changes, not when callbacks change
	const addEventRef = useRef(addEvent)
	const onEventRef = useRef(onEvent)
	
	// Update refs when callbacks change
	useEffect(() => {
		addEventRef.current = addEvent
		onEventRef.current = onEvent
	}, [addEvent, onEvent])

	useEffect(() => {
		// 🔹 FIX: Prevent multiple connections - check if already connected or connecting
		if (!realtime) {
			if (wsRef.current) {
				wsRef.current.close()
				wsRef.current = null
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
				reconnectTimeoutRef.current = null
			}
			isConnectingRef.current = false
			return
		}

		// 🔹 FIX: Don't create a new connection if one already exists
		if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
			return
		}

		let reconnectAttempts = 0
		const maxReconnectAttempts = 5
		const reconnectDelay = 3000

		function connect() {
			// 🔹 FIX: Prevent multiple simultaneous connection attempts
			if (isConnectingRef.current || (wsRef.current?.readyState === WebSocket.OPEN)) {
				return
			}
			
			isConnectingRef.current = true
			
			try {
				// 🔹 FIX: Close existing connection if any before creating new one
				if (wsRef.current) {
					wsRef.current.close()
					wsRef.current = null
				}
				
				const ws = new WebSocket(WS_URL)
				wsRef.current = ws

				ws.onopen = () => {
					console.log('WebSocket connected to backend')
					reconnectAttempts = 0
					isConnectingRef.current = false
				}

				// 🔹 Process WebSocket messages immediately for real-time updates
				// Backend already handles deduplication, so we can process events immediately
				ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data)
						const actionMap: Record<string, 'added' | 'modified' | 'deleted'> = {
							'created': 'added',
							'modified': 'modified',
							'deleted': 'deleted',
							'moved': 'modified' // Treat moved as modified for folders
						}
						const isFolder = data.is_folder === true
						const filePath = data.file_path || data.filename
						
						// Add [Folder] prefix for folder events
						const folderPrefix = isFolder ? '[Folder] ' : ''
						const displayPath = data.parent_folder
							? `${folderPrefix}[${data.parent_folder}] ${filePath}`
							: `${folderPrefix}${filePath}`
				
						const frontendEvent: FileEvent = {
							id: crypto.randomUUID(),
							filePath: displayPath,
							action: actionMap[data.event] || 'modified',
							timestamp: new Date(data.timestamp).getTime(),
							status: 'ok'
						}
				
						// Process event immediately - backend already handles deduplication
						addEventRef.current(frontendEvent)
						onEventRef.current?.(frontendEvent)
					} catch (error) {
						console.error('Error parsing WebSocket message:', error)
					}
				}
				ws.onerror = (error) => {
					console.error('WebSocket error:', error)
					isConnectingRef.current = false
				}

				ws.onclose = () => {
					console.log('WebSocket disconnected')
					wsRef.current = null
					isConnectingRef.current = false

					// Attempt to reconnect if realtime is still enabled
					if (realtime && reconnectAttempts < maxReconnectAttempts) {
						reconnectAttempts++
						console.log(`Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
						reconnectTimeoutRef.current = window.setTimeout(() => {
							connect()
						}, reconnectDelay)
					} else if (reconnectAttempts >= maxReconnectAttempts) {
						console.error('Max reconnection attempts reached. Please check if the backend is running.')
					}
				}
			} catch (error) {
				console.error('Error creating WebSocket connection:', error)
				isConnectingRef.current = false
				if (realtime && reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++
					reconnectTimeoutRef.current = window.setTimeout(() => {
						connect()
					}, reconnectDelay)
				}
			}
		}

		connect()

		return () => {
			isConnectingRef.current = false
			if (wsRef.current) {
				wsRef.current.close()
				wsRef.current = null
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
				reconnectTimeoutRef.current = null
			}
		}
		// 🔹 FIX: Only depend on `realtime` - callbacks are accessed via refs
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [realtime])
}

