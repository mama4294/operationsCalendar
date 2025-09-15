import React from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
} from "@fluentui/react-components";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  operationCount?: number;
}

export const DeleteConfirmationDialog: React.FC<
  DeleteConfirmationDialogProps
> = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirm Delete",
  message,
  operationCount = 1,
}) => {
  const defaultMessage =
    operationCount === 1
      ? "Are you sure you want to delete this operation?"
      : `Are you sure you want to delete ${operationCount} operations?`;
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogTitle>{title}</DialogTitle>
        <DialogBody style={{ display: "block" }}>
          {message || defaultMessage}
        </DialogBody>
        <DialogActions>
          <Button appearance="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button appearance="primary" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
