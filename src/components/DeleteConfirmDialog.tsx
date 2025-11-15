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

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  isPermanent?: boolean;
}

export const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isPermanent = false,
}: DeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPermanent ? "Permanently Delete?" : "Move to Recycle Bin?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPermanent ? (
              <>
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-foreground">{itemName}</span>?
                <br />
                <span className="text-destructive font-semibold">
                  This action cannot be undone.
                </span>
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">{itemName}</span>?
                <br />
                You can restore it from the Recycle Bin later.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={isPermanent ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {isPermanent ? "Delete Forever" : "Move to Recycle Bin"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
