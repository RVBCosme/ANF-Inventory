import type { InputHTMLAttributes } from "react";

export function NumberField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-lg font-semibold">{label}</span>
      <input
        {...props}
        type="number"
        inputMode="decimal"
        className="w-full rounded-lg border-2 border-line px-4 py-3 text-lg focus:border-primary focus:outline-none"
      />
    </label>
  );
}
