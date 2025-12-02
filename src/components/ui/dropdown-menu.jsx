import React, { useRef, useEffect } from "react";
import { cn } from "@/utils/cn";

// Slot helper for asChild
const Slot = React.forwardRef(({ children, ...props }, ref) =>
  React.cloneElement(children, { ...props, ref })
);

export const DropdownMenu = ({ children }) => {
  return <div className="relative inline-block">{children}</div>;
};

export const DropdownMenuTrigger = React.forwardRef(
  ({ className, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (e) => {
      e.stopPropagation(); // IMPORTANT FIX
      onClick?.(e);
    };

    return (
      <Comp
        ref={ref}
        className={cn("outline-none", className)}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = React.forwardRef(
  ({ className, align = "start", open, setOpen, ...props }, ref) => {
    const panelRef = useRef(null);

    // Outside click
    useEffect(() => {
      const handler = (e) => {
        if (
          panelRef.current &&
          !panelRef.current.contains(e.target)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [setOpen]);

    if (!open) return null;

    return (
      <div
        ref={panelRef}
        className={cn(
          "absolute mt-2 z-50 min-w-[10rem] rounded-md border bg-white shadow-lg p-1 text-sm",
          align === "end" ? "right-0" : "left-0",
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        className={cn(
          "px-2 py-1.5 cursor-pointer rounded hover:bg-gray-100 flex items-center gap-2",
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-gray-200", className)}
      {...props}
    />
  )
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
