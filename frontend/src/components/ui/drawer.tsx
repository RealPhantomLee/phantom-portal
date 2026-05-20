import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: "left" | "right" | "top" | "bottom"
  children: React.ReactNode
  className?: string
}

export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  ({ open, onOpenChange, side = "right", children, className }, ref) => {
    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = "unset"
      }
      return () => {
        document.body.style.overflow = "unset"
      }
    }, [open])

    const slideDirections = {
      left: "slide-in-right",
      right: "slide-in-right",
      top: "slide-in-down",
      bottom: "slide-in-up",
    }

    return (
      <>
        {/* Overlay */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => onOpenChange(false)}
          />
        )}

        {/* Drawer Panel */}
        <div
          ref={ref}
          className={cn(
            "fixed z-50 bg-obsidian-surface border border-obsidian-border shadow-lg transition-transform duration-300",
            side === "right" && `right-0 top-0 h-screen w-96 ${open ? "translate-x-0" : "translate-x-full"}`,
            side === "left" && `left-0 top-0 h-screen w-96 ${open ? "translate-x-0" : "-translate-x-full"}`,
            side === "bottom" && `bottom-0 left-0 w-full h-1/2 ${open ? "translate-y-0" : "translate-y-full"}`,
            className
          )}
        >
          {children}
        </div>
      </>
    )
  }
)
Drawer.displayName = "Drawer"

interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

export const DrawerHeader = React.forwardRef<
  HTMLDivElement,
  DrawerHeaderProps
>(({ className, onClose, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between border-b border-obsidian-border p-4",
      className
    )}
    {...props}
  >
    <div className="flex-1">{children}</div>
    {onClose && (
      <button
        onClick={onClose}
        className="ml-2 rounded-md p-1 text-obsidian-text-muted hover:bg-obsidian-surface-hover hover:text-obsidian-text transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    )}
  </div>
))
DrawerHeader.displayName = "DrawerHeader"

export const DrawerContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto p-4", className)}
    {...props}
  />
))
DrawerContent.displayName = "DrawerContent"
