import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { SECURITY_PIN } from "@/lib/securityPin";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  isPermanent?: boolean;
  requirePin?: boolean;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
}

export const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isPermanent = false,
  requirePin = true,
  title,
  description,
  confirmLabel,
}: DeleteConfirmDialogProps) => {
  const [pin, setPin] = useState("");
  useEffect(() => { if (!open) setPin(""); }, [open]);
  const ok = !requirePin || pin === SECURITY_PIN;
  const wrong = requirePin && pin.length >= SECURITY_PIN.length && !ok;

  const confirm = () => { if (ok) { onConfirm(); setPin(""); } };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? (isPermanent ? "Permanently Delete?" : "Move to Recycle Bin?")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {description ?? (isPermanent ? (
                <>
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-foreground">{itemName}</span>?
                  <br />
                  <span className="text-destructive font-semibold">This action cannot be undone.</span>
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">{itemName}</span>?
                  <br />
                  You can restore it from the Recycle Bin later.
                </>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {requirePin && (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="security-pin">Enter security PIN</label>
            <Input
              id="security-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirm(); } }}
            />
            {wrong && <p className="text-xs text-destructive">Incorrect PIN.</p>}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ok}
            onClick={(e) => { if (!ok) { e.preventDefault(); return; } confirm(); }}
            className={isPermanent ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {confirmLabel ?? (isPermanent ? "Delete Forever" : "Move to Recycle Bin")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
