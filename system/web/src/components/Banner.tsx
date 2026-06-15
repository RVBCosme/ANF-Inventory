import type { ReactNode } from "react";

type Kind = "ok" | "warn" | "danger";

const styles: Record<Kind, string> = {
  ok: "bg-ok-surface text-ok-text",
  warn: "bg-warn-surface text-warn-text",
  danger: "bg-danger text-white",
};

export function Banner({ kind, children }: { kind: Kind; children: ReactNode }) {
  return (
    <div
      className={`rounded-lg px-4 py-3 text-lg ${styles[kind]}`}
      role={kind === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
