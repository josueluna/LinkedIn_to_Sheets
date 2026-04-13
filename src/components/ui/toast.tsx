import { useEffect } from "react";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "warning";
  onClose: () => void;
};

export function Toast({ message, type = "warning", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyles =
    "fixed bottom-4 left-4 right-4 z-50 px-4 py-3 rounded-lg text-sm shadow-lg";

  const typeStyles = {
    success: "bg-green-100 border border-green-400 text-green-800",
    error: "bg-red-100 border border-red-400 text-red-800",
    warning: "bg-yellow-100 border border-yellow-400 text-yellow-800",
  };

  return (
    <div className={`${baseStyles} ${typeStyles[type]}`}>
      {message}
    </div>
  );
}