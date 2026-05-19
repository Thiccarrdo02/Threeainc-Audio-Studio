"use client";

import { Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

interface PromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog(props: PromptDialogProps) {
  if (!props.open) return null;
  return <PromptDialogInner key={props.defaultValue ?? ""} {...props} />;
}

function PromptDialogInner({
  title,
  description,
  defaultValue = "",
  placeholder,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  maxLength,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={onCancel}
        >
          <X size={14} aria-hidden="true" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary-light)] text-theme-primary">
            <Pencil size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3
              id="prompt-dialog-title"
              className="font-heading text-base font-semibold"
            >
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="submit" size="sm" disabled={!value.trim()}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
