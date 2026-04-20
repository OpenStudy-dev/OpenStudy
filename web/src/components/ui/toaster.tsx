import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-center"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface !text-fg !border !border-border/60 rounded-lg shadow-xl",
          actionButton: "!bg-primary !text-primary-fg !rounded-md !px-3 !py-1.5",
          cancelButton: "!bg-surface-2 !text-muted",
        },
      }}
    />
  );
}
