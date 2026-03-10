import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
	const [dark, setDark] = useState(false)

	useEffect(() => {
		const initial = localStorage.getItem('theme') === 'dark' || (
			!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches
		)
		setDark(initial)
		document.documentElement.classList.toggle('dark', initial)
	}, [])

	function toggle() {
		const next = !dark
		setDark(next)
		document.documentElement.classList.toggle('dark', next)
		localStorage.setItem('theme', next ? 'dark' : 'light')
	}

	return (
		<button
			onClick={toggle}
			className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
			aria-label="Toggle theme"
		>
			{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</button>
	)
}

