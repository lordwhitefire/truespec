"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The platform's modal, in place of the hand-built `.ovl`/`.mdl` div (Task 13).
 *
 * `showModal()` gives the four things the old div had to be trusted for: everything outside is
 * inert, focus is trapped, Escape is the platform's own request to close, and the dialog sits in
 * the top layer above every stacking context. The name is still ours — `labelledBy` points at the
 * heading the caller already wrote (or `label` names it directly).
 *
 * The element stays mounted and follows `open`, so `close()` runs before the caller unmounts
 * anything and the browser can put focus back on whatever opened it. The class stays `ovl` and the
 * content stays `.mdl`: only the element the platform owns changed.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  label,
  id,
  dismissOnBackdrop = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  id?: string;
  /** Temporary: callers that closed on an outside tap before the conversion keep doing so. */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      id={id}
      className="ovl"
      aria-labelledby={labelledBy}
      aria-label={label}
      onCancel={(event) => {
        // Close through the caller's state, so the dialog and the screen never disagree.
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        // A close we did not ask for (the platform's own) still has to reach the screen.
        if (open) onClose();
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
