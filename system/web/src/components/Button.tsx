import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-primary hover:bg-primary-hover text-white",
  secondary: "bg-ash hover:opacity-90 text-ink",
  danger: "bg-danger hover:bg-danger-hover text-white",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`min-h-[48px] px-5 rounded-lg text-lg font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}
