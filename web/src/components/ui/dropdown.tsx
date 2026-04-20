import * as React from "react";
import * as D from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export const Dropdown = D.Root;
export const DropdownTrigger = D.Trigger;
export const DropdownPortal = D.Portal;

export const DropdownContent = React.forwardRef<
  React.ElementRef<typeof D.Content>,
  React.ComponentPropsWithoutRef<typeof D.Content>
>(function DropdownContent({ className, sideOffset = 4, ...props }, ref) {
  return (
    <D.Portal>
      <D.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-md border border-border/60 bg-surface text-fg p-1 shadow-xl",
          "animate-fade-in",
          className
        )}
        {...props}
      />
    </D.Portal>
  );
});

export const DropdownItem = React.forwardRef<
  React.ElementRef<typeof D.Item>,
  React.ComponentPropsWithoutRef<typeof D.Item> & { danger?: boolean }
>(function DropdownItem({ className, danger, ...props }, ref) {
  return (
    <D.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none",
        "focus:bg-surface-2",
        danger && "text-critical focus:text-critical",
        className
      )}
      {...props}
    />
  );
});

export const DropdownSeparator = D.Separator;
