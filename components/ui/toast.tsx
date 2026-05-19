"use client";

import { CheckCircle2, Info, AlertCircle, X } from "lucide-react";

export type ToastTone = "success" | "info" | "error";

interface ToastProps {
  message: string;
  tone?: ToastTone;
  onDismiss?: () => void;
}

export function Toast({ message, tone = "info", onDismiss }: ToastProps) {
  if (!message) return null;

  const palette =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-border bg-card text-foreground";

  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm ${palette}`}
    >
      <Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss notification"
          className="rounded p-0.5 opacity-70 transition hover:opacity-100"
          onClick={onDismiss}
        >
          <X size={12} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
