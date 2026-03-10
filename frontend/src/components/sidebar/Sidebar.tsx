import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpenDot, Settings, Shield } from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'

export function Sidebar() {
	return (
		<aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card/50 backdrop-blur-sm">
			<div className="flex h-dvh flex-col px-4 py-6 gap-6">
				<div className="flex items-center gap-2 px-2">
					<Shield className="h-6 w-6 text-primary" />
					<div className="font-semibold">Integrity Monitor</div>
				</div>
				<nav className="flex flex-col gap-1">
					<SidebarLink to="/" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
					<SidebarLink to="/logs" label="Logs" icon={<FolderOpenDot className="h-4 w-4" />} />
					<SidebarLink to="/settings" label="Settings" icon={<Settings className="h-4 w-4" />} />
				</nav>
				<div className="mt-auto">
					<ThemeToggle />
				</div>
			</div>
		</aside>
	)
}

function SidebarLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
					isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
				}`
			}
		>
			<span>{icon}</span>
			<span>{label}</span>
		</NavLink>
	)
}

