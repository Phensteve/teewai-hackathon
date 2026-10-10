import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastViewport>
      {toasts.map(({ id, title, description, action, variant, open }) => (
        <Toast
          key={id}
          variant={variant}
          className={
            open
              ? "animate-in fade-in-0 slide-in-from-top-2 sm:slide-in-from-top-0 sm:slide-in-from-bottom-2 duration-300"
              : "animate-out fade-out-0 slide-out-to-right-4 duration-200 fill-mode-forwards"
          }
        >
          {variant === "destructive" ? (
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose onClick={() => dismiss(id)} />
        </Toast>
      ))}
    </ToastViewport>
  );
}