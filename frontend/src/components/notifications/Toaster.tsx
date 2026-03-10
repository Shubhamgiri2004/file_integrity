import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'

type Toast = {
	id: string
	title?: string
	description?: string
}

const toastContext = React.createContext<{
	toasts: Toast[]
	addToast: (toast: Omit<Toast, 'id'>) => void
	removeToast: (id: string) => void
} | null>(null)

export function Toaster() {
	const [toasts, setToasts] = React.useState<Toast[]>([])

	const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
		const id = crypto.randomUUID()
		setToasts((prev) => [...prev, { ...toast, id }])
		// Auto remove after 5 seconds
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id))
		}, 5000)
	}, [])

	const removeToast = React.useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id))
	}, [])

	return (
		<toastContext.Provider value={{ toasts, addToast, removeToast }}>
			<ToastPrimitive.Provider swipeDirection="right">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
				))}
				<ToastViewport />
			</ToastPrimitive.Provider>
		</toastContext.Provider>
	)
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
	const [open, setOpen] = React.useState(true)

	return (
		<ToastPrimitive.Root
			open={open}
			onOpenChange={(o) => {
				setOpen(o)
				if (!o) onClose()
			}}
			className="group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-border bg-card p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"
		>
			<div className="grid gap-1">
				{toast.title && <ToastPrimitive.Title className="text-sm font-semibold">{toast.title}</ToastPrimitive.Title>}
				{toast.description && <ToastPrimitive.Description className="text-sm opacity-90">{toast.description}</ToastPrimitive.Description>}
			</div>
			<ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600">
				<X className="h-4 w-4" />
			</ToastPrimitive.Close>
		</ToastPrimitive.Root>
	)
}

function ToastViewport() {
	return <ToastPrimitive.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
}

export function useToast() {
	const context = React.useContext(toastContext)
	if (!context) {
		// Fallback for when used outside provider
		return {
			toast: (title?: string, description?: string) => {
				console.log('Toast:', title, description)
			},
		}
	}

	return {
		toast: (title?: string, description?: string) => {
			context.addToast({ title, description })
		},
	}
}

