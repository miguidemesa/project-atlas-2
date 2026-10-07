import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Holo Night buttons (DESIGN.md › Buttons): pills, 44px by default, holo cyan as the only fill. One primary per view.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-[15px] font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-[180ms] ease-out outline-none select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-urgent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-accent-hover",
        outline: "border-line-hv text-ink hover:bg-hover-wash",
        secondary: "bg-raised text-ink hover:bg-hover-wash",
        ghost: "text-ink-dim hover:bg-hover-wash hover:text-ink",
        destructive: "border-urgent-line text-urgent hover:bg-hover-wash",
        link: "rounded-none px-0 text-accent hover:text-accent-hover",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-10 px-4",
        lg: "h-12 px-6",
        xl: "h-[52px] px-7",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
