import { Search, Bell } from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Avatar, AvatarFallback } from '../ui/Avatar'

export function Topbar() {
	return (
		<header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex items-center gap-3 px-4 py-3">
				<div className="relative max-w-md flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<input
						placeholder="Search files or events..."
						className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
				<div className="flex items-center gap-2">
					<button className="relative inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
						<Bell className="h-4 w-4" />
					</button>
					<ThemeToggle />
					<Avatar>
						<AvatarFallback>IM</AvatarFallback>
					</Avatar>
				</div>
			</div>
		</header>
	)
}

