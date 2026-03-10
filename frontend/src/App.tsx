import { Outlet } from 'react-router-dom'
import { Sidebar } from './components/sidebar/Sidebar'
import { Topbar } from './components/topbar/Topbar'
import { Toaster } from './components/notifications/Toaster'
import './index.css'

function App() {
	return (
		<div className="min-h-dvh bg-background text-foreground">
			<div className="flex">
				<Sidebar />
				<div className="flex-1 flex flex-col">
					<Topbar />
					<main className="p-4 md:p-6">
						<Outlet />
					</main>
				</div>
			</div>
			<Toaster />
		</div>
	)
}

export default App
