import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Icons";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2.5 h-[52px] px-8 rounded-btn text-body font-medium " +
  "transition-all duration-200 ease-out select-none whitespace-nowrap " +
  "disabled:opacity-45 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "brand-gradient text-white shadow-button hover:-translate-y-[2px] hover:scale-[1.02] hover:shadow-glow active:translate-y-0 active:scale-[0.99]",
  secondary:
    "bg-white/90 backdrop-blur text-ink-700 border border-mist-200 shadow-soft hover:bg-white hover:border-iris-200 hover:-translate-y-[2px] hover:scale-[1.02] active:translate-y-0",
  ghost: "text-ink-500 hover:text-ink-900 hover:bg-iris-50/70",
};

export function Button({
  variant = "primary",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner className="w-[18px] h-[18px]" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
