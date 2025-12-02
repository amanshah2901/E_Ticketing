import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

const SelectContext = createContext();

export function Select({ value, onValueChange, children, className }) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className={cn("relative", className)}>{children}</div>
    </SelectContext.Provider>
  );
}

export const SelectTrigger = ({ className, children }) => {
  const { open, setOpen } = useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
        className
      )}
    >
      <div className="flex-1 text-left">{children}</div>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

export const SelectValue = ({ placeholder }) => {
  const { value } = useContext(SelectContext);

  return (
    <span className="block truncate text-gray-700">
      {value ? value : placeholder}
    </span>
  );
};

export const SelectContent = ({ className, children }) => {
  const { open, setOpen } = useContext(SelectContext);
  const ref = useRef();

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md p-1",
        className
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem = ({ value, children, className }) => {
  const { onValueChange, setOpen } = useContext(SelectContext);

  return (
    <div
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      className={cn(
        "px-3 py-2 rounded-sm text-sm hover:bg-accent cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
};
