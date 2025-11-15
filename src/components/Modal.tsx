import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  showCloseButton?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className={`card-glass p-6 w-full ${maxWidthClasses[maxWidth]} mx-4 shadow-2xl relative`}>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-warm hover:text-warm-dark transition text-xl font-bold leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}
        {title && (
          <h2 className={`text-lg font-semibold text-warm-dark mb-2 ${showCloseButton ? "pr-8" : ""}`}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

