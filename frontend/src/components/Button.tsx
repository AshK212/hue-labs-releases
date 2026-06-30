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
  "inline-flex items-center justify-center gap-2 h-12 px-7 rounded-btn text-body font-medium " +
  "transition-all duration-200 ease-out select-none whitespace-nowrap " +
  "disabled:opacity-45 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-sky-500 text-white shadow-button hover:bg-sky-600 hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.99]",
  secondary:
    "bg-white text-ink-700 border border-mist-200 shadow-soft hover:bg-mist-50 hover:-translate-y-[2px] active:translate-y-0",
  ghost: "text-ink-500 hover:text-ink-900 hover:bg-mist-100",
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
