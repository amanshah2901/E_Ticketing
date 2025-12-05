import React from "react";
import { cn } from "@/utils/cn";

/**
 * True controlled Radio Group Component
 */
export const RadioGroup = React.forwardRef(
  ({ className, value, onValueChange, name = "radio-group", children, ...props }, ref) => {
    const cloneRecursively = (child) => {
      if (!child || typeof child !== 'object' || !('props' in child)) return child;

      // If this is the RadioGroupItem, clone it with new props
      if (child.type === RadioGroupItem) {
        return React.cloneElement(child, {
          checked: child.props.value === value,
          onChange: () => onValueChange(child.props.value),
          name,
        });
      }

      // If it has children, map over them and continue recursively
      if (child.props.children) {
        const newChildren = React.Children.map(child.props.children, cloneRecursively);
        return React.cloneElement(child, {}, newChildren);
      }

      return child;
    };

    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        {...props}
      >
        {React.Children.map(children, cloneRecursively)}
      </div>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

export const RadioGroupItem = React.forwardRef(
  ({ className, checked, onChange, name, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="radio"
        name={name}                              // <-- ★ Required for single-selection
        checked={checked}
        onChange={onChange}
        className={cn(
          "h-4 w-4 text-primary border-primary focus:ring-primary focus:ring-2",
          className
        )}
        {...props}
      />
    );
  }
);

RadioGroupItem.displayName = "RadioGroupItem";
