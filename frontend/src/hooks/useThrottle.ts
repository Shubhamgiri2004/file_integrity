import { useRef, useCallback, useEffect } from 'react'

/**
 * Custom hook for throttling function calls.
 * Ensures the function is called at most once within the specified interval.
 * Unlike debounce, throttle executes immediately and then waits for the interval.
 * 
 * @param callback - The function to throttle
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Throttled version of the callback
 */
export function useThrottle<T extends (...args: any[]) => void>(
	callback: T,
	delay: number = 500
): T {
	const lastRunRef = useRef<number>(0)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const callbackRef = useRef(callback)

	// Update callback ref when it changes
	useEffect(() => {
		callbackRef.current = callback
	}, [callback])

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	const throttledCallback = useCallback(
		((...args: Parameters<T>) => {
			const now = Date.now()
			const timeSinceLastRun = now - lastRunRef.current

			if (timeSinceLastRun >= delay) {
				// Enough time has passed, execute immediately
				lastRunRef.current = now
				callbackRef.current(...args)
			} else {
				// Schedule execution after the remaining delay
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current)
				}

				const remainingDelay = delay - timeSinceLastRun
				timeoutRef.current = setTimeout(() => {
					lastRunRef.current = Date.now()
					callbackRef.current(...args)
				}, remainingDelay)
			}
		}) as T,
		[delay]
	)

	return throttledCallback
}

