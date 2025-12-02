import React from 'react'
import { cn } from '@/utils/cn'

const ScrollArea = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("overflow-auto", className)}
    {...props}
  />
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }