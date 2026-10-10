import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Compact, non-intrusive toast system (Vercel/Linear-style):
// - Mobile: slim banners pinned to the top, full-width minus margins.
// - Desktop: small cards stacked bottom-right, max 356px wide.
// - Never blocks the page: the viewport is pointer-events-none.
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed z-[100] flex flex-col gap-2 pointer-events-none left-3 right-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] sm:top-auto sm:left-auto sm:bottom-4 sm:right-4 sm:w-[356px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

// Kept for backwards compatibility with existing imports.
const ToastProvider = ToastViewport;

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-start gap-2.5 overflow-hidden rounded-xl border p-3.5 pr-9 shadow-lg shadow-black/10 backdrop-blur-md transition-all",
  {
    variants: {
      variant: {
        default: "border-border bg-card/95 text-card-foreground",
        destructive: "border-destructive/40 bg-card/95 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-border bg-transparent px-2.5 text-xs font-medium transition-colors hover:bg-muted focus:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-foreground hover:bg-muted focus:outline-none",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[13px] font-semibold leading-tight", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs text-muted-foreground leading-snug mt-0.5", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};