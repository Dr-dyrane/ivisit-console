import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full min-w-0 rounded-button bg-foreground/[0.045] px-3 py-1 text-base transition-colors file:bg-transparent file:text-sm file:font-normal file:text-foreground placeholder:text-muted-foreground focus-visible:bg-foreground/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.06] dark:focus-visible:bg-white/[0.09] md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
