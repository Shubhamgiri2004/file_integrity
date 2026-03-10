const API_BASE_URL = 'http://localhost:8000'

export interface BackendFileEvent {
	event: 'created' | 'modified' | 'deleted' | 'moved'
	filename: string
	file_path: string
	parent_folder: string
	timestamp: string
	hash: string
	is_folder?: boolean
}

export async function fetchEvents(limit?: number, eventType?: string): Promise<BackendFileEvent[]> {
	const params = new URLSearchParams()
	if (limit) params.append('limit', limit.toString())
	if (eventType) params.append('event_type', eventType)

	const url = `${API_BASE_URL}/events${params.toString() ? '?' + params.toString() : ''}`
	const response = await fetch(url)
	
	if (!response.ok) {
		throw new Error(`Failed to fetch events: ${response.statusText}`)
	}

	return response.json()
}

export async function fetchStats() {
	const response = await fetch(`${API_BASE_URL}/api/stats`)
	
	if (!response.ok) {
		throw new Error(`Failed to fetch stats: ${response.statusText}`)
	}

	return response.json()
}

export async function clearEvents() {
	const response = await fetch(`${API_BASE_URL}/events`, {
		method: 'DELETE'
	})
	
	if (!response.ok) {
		throw new Error(`Failed to clear events: ${response.statusText}`)
	}

	return response.json()
}

export async function fetchSettings() {
	const response = await fetch(`${API_BASE_URL}/api/settings`)
	
	if (!response.ok) {
		throw new Error(`Failed to fetch settings: ${response.statusText}`)
	}

	return response.json()
}

export async function updateSettings(monitoredPath: string) {
	const response = await fetch(`${API_BASE_URL}/api/settings`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ monitored_path: monitoredPath })
	})
	
	if (!response.ok) {
		throw new Error(`Failed to update settings: ${response.statusText}`)
	}

	return response.json()
}

