import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/events'
import { fetchSettings, updateSettings } from '../api/events'
import { useToast } from '../components/notifications/Toaster'

export default function Settings() {
	const { monitoredPath, setMonitoredPath, realtime, setRealtime } = useSettingsStore()
	const { toast } = useToast()
	const [backendPath, setBackendPath] = useState<string>('')
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	// Load settings from backend
	useEffect(() => {
		async function loadSettings() {
			try {
				const settings = await fetchSettings()
				setBackendPath(settings.monitored_path)
				setMonitoredPath(settings.monitored_path)
			} catch (error) {
				console.error('Failed to load settings from backend:', error)
				toast('Warning', 'Could not load settings from backend.')
			} finally {
				setIsLoading(false)
			}
		}

		loadSettings()
	}, [setMonitoredPath, toast])

	const handleSavePath = async () => {
		setIsSaving(true)
		try {
			const result = await updateSettings(monitoredPath)
			setBackendPath(result.monitored_path)
			
			// Also update the watcher path on the backend
			try {
				const response = await fetch('http://localhost:8000/api/watcher/update-path', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ path: monitoredPath })
				})
				if (!response.ok) {
					console.warn('Warning: Could not update watcher path, but settings were saved')
				}
			} catch (err) {
				console.warn('Warning: Could not update watcher path:', err)
			}
			
			toast('Success', 'Monitored path updated successfully')
		} catch (error) {
			console.error('Failed to update settings:', error)
			toast('Error', 'Failed to update monitored path. Please check if the backend is running.')
		} finally {
			setIsSaving(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-muted-foreground">Loading settings...</div>
			</div>
		)
	}

	return (
		<div className="max-w-2xl space-y-6">
			<div className="rounded-lg border border-border p-4">
				<div className="text-sm font-medium mb-2">Monitored Folder Path</div>
				<div className="flex gap-2">
					<input
						value={monitoredPath}
						onChange={(e) => setMonitoredPath(e.target.value)}
						className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
						placeholder="C:/path/to/folder"
					/>
					<button
						onClick={handleSavePath}
						disabled={isSaving || monitoredPath === backendPath}
						className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50 hover:bg-primary/90"
					>
						{isSaving ? 'Saving...' : 'Save'}
					</button>
				</div>
				{backendPath && (
					<div className="mt-2 text-xs text-muted-foreground">
						Current backend path: {backendPath}
					</div>
				)}
			</div>
			<div className="rounded-lg border border-border p-4">
				<label className="flex items-center gap-3 text-sm">
					<input type="checkbox" checked={realtime} onChange={(e) => setRealtime(e.target.checked)} />
					Enable real-time updates (WebSocket connection)
				</label>
				<div className="mt-2 text-xs text-muted-foreground">
					When enabled, the frontend will receive real-time file change notifications via WebSocket.
				</div>
			</div>
		</div>
	)
}

