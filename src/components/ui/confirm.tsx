"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "./dialog";
import { Button, type ButtonProps } from "./button";

/** Button that asks for confirmation before running a destructive action. */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Bestätigen",
  onConfirm,
  pending,
  children,
  ...buttonProps
}: ButtonProps & { title: string; description: string; confirmLabel?: string; onConfirm: () => void; pending?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <DialogContent title={title} size="sm">
        <p className="text-sm text-muted">{description}</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
