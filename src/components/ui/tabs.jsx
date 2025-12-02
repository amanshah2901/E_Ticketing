import React, { createContext, useContext } from "react";
import { cn } from "@/utils/cn";

// ----------------------
// Tabs Context
// ----------------------
const TabsContext = createContext();

export function Tabs({ value, onValueChange, className, children }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("flex flex-col gap-2", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ----------------------
// TabsList
// ----------------------
export const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

// ----------------------
// TabsTrigger
// ----------------------
export const TabsTrigger = React.forwardRef(
  ({ value, className, ...props }, ref) => {
    const { value: active, onValueChange } = useContext(TabsContext);

    return (
      <button
        ref={ref}
        onClick={() => onValueChange?.(value)}
        data-state={active === value ? "active" : "inactive"}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          active === value &&
            "bg-background text-foreground shadow-sm",
          className
        )}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

// ----------------------
// TabsContent
// ----------------------
export const TabsContent = React.forwardRef(
  ({ value, className, children, ...props }, ref) => {
    const { value: active } = useContext(TabsContext);

    if (active !== value) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";
