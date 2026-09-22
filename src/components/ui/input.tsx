import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, step, ...props }, ref) => {
    // When type="number", default to step="any" to prevent HTML5 browser validation errors
    // such as "Please enter a valid value. The two nearest valid values are..."
    const effectiveStep = type === "number" ? (step === undefined ? "any" : (step === "any" ? "any" : "any")) : step;

    return (
      <input
        type={type}
        step={effectiveStep}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
