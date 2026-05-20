import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-obsidian-accent focus:ring-offset-obsidian-bg",
  {
    variants: {
      variant: {
        default:
          "border-obsidian-accent bg-obsidian-accent/20 text-obsidian-accent-light hover:bg-obsidian-accent/30",
        secondary:
          "border-obsidian-border bg-obsidian-surface text-obsidian-text hover:bg-obsidian-surface-hover",
        destructive:
          "border-red-900/50 bg-red-900/20 text-red-400 hover:bg-red-900/30",
        success:
          "border-green-900/50 bg-green-900/20 text-green-400 hover:bg-green-900/30",
        warning:
          "border-amber-900/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
