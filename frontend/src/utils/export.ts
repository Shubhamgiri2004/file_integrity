/**
 * Export utilities for downloading data as CSV
 */

import type { FileEvent } from '../store/events'

/**
 * Convert events to CSV format
 */
function eventsToCSV(events: FileEvent[]): string {
	// CSV header
	const header = 'File,Action,Timestamp,Status\n'
	
	// CSV rows
	const rows = events.map((event) => {
		// Escape file path (handle commas and quotes)
		const file = `"${event.filePath.replace(/"/g, '""')}"`
		const action = event.action
		const timestamp = new Date(event.timestamp).toISOString()
		const status = event.status
		
		return `${file},${action},${timestamp},${status}`
	})
	
	return header + rows.join('\n')
}

/**
 * Download events as CSV file
 */
export function exportEventsToCSV(events: FileEvent[], filename: string = 'file-integrity-events.csv'): void {
	try {
		const csvContent = eventsToCSV(events)
		
		// Create blob with CSV content
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		
		// Create download link
		const link = document.createElement('a')
		const url = URL.createObjectURL(blob)
		
		link.setAttribute('href', url)
		link.setAttribute('download', filename)
		link.style.visibility = 'hidden'
		
		// Trigger download
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		
		// Clean up URL
		URL.revokeObjectURL(url)
	} catch (error) {
		console.error('Error exporting events to CSV:', error)
		throw error
	}
}


