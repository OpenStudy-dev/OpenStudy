import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Mobile-first sheet.
 * - On phones: full-screen slide-up from bottom.
 * - On desktop (≥ sm): centered modal with max width.
 *
 * Animations use tailwindcss-animate's data-state-keyed utilities so Radix's
 * Presence waits for animationend before unmounting — exits actually play.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: string;
    description?: string;
  }
>(function SheetContent({ title, description, className, children, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-40 bg-black/60",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-150",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150"
        )}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 bg-surface text-fg",
          // Mobile: slide up from bottom, cover most of screen
          "inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-xl border-t border-border/60",
          // Desktop: center, max width, rounded everywhere
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md",
          "sm:rounded-xl sm:border sm:max-h-[85vh]",
          // Enter animations
          "data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:ease-out",
          "data-[state=open]:slide-in-from-bottom data-[state=open]:fade-in-0",
          "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          // Exit animations (Radix keeps the node mounted while these play)
          "data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:ease-in",
          "data-[state=closed]:slide-out-to-bottom data-[state=closed]:fade-out-0",
          "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/60 bg-surface px-4 py-3">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-base font-semibold truncate">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-xs text-muted truncate">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="px-4 py-4 pb-8 safe-bottom">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
