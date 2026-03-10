/**
 * Browser desktop notification utilities
 * Requests permission and shows notifications for file events
 */

let permissionGranted: boolean | null = null

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
	if (!('Notification' in window)) {
		console.warn('This browser does not support desktop notifications')
		return false
	}

	if (Notification.permission === 'granted') {
		permissionGranted = true
		return true
	}

	if (Notification.permission === 'denied') {
		permissionGranted = false
		return false
	}

	// Request permission
	try {
		const permission = await Notification.requestPermission()
		permissionGranted = permission === 'granted'
		return permissionGranted
	} catch (error) {
		console.error('Error requesting notification permission:', error)
		return false
	}
}

/**
 * Show a desktop notification for a file event
 */
export function showFileEventNotification(
	fileName: string,
	action: 'added' | 'modified' | 'deleted',
	timestamp: number
): void {
	if (!('Notification' in window)) {
		return
	}

	if (Notification.permission !== 'granted') {
		// Try to request permission if not already denied
		if (Notification.permission === 'default') {
			requestNotificationPermission().then((granted) => {
				if (granted) {
					showFileEventNotification(fileName, action, timestamp)
				}
			})
		}
		return
	}

	// Determine notification icon and message
	const actionLabels: Record<string, string> = {
		added: 'File Added',
		modified: 'File Modified',
		deleted: 'File Deleted',
	}

	const actionEmojis: Record<string, string> = {
		added: '➕',
		modified: '✏️',
		deleted: '🗑️',
	}

	const title = `${actionEmojis[action]} ${actionLabels[action]}`
	const body = `${fileName}\n${new Date(timestamp).toLocaleString()}`

	// Show notification
	try {
		const notification = new Notification(title, {
			body,
			icon: '/favicon.ico', // You can customize this
			tag: `file-event-${fileName}-${action}`, // Prevent duplicate notifications
			requireInteraction: false,
		})

		// Auto-close after 5 seconds
		setTimeout(() => {
			notification.close()
		}, 5000)

		// Handle click to focus window
		notification.onclick = () => {
			window.focus()
			notification.close()
		}
	} catch (error) {
		console.error('Error showing notification:', error)
	}
}


