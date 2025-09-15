import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Button,
  Field,
  Input,
} from "@fluentui/react-components";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
// Color is auto-generated elsewhere (getBatchColor); manual selection removed.

interface BatchDialogProps {
  batch?: cr2b6_batcheses;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (batch: Partial<cr2b6_batcheses>) => void;
}

export const BatchDialog: React.FC<BatchDialogProps> = ({
  batch,
  open,
  onOpenChange,
  onSave,
}) => {
  const [batchId, setBatchId] = useState("");
  // Color state removed – color is derived automatically.

  useEffect(() => {
    if (open) {
      if (batch) {
        setBatchId(batch.cr2b6_batchnumber ?? batch.cr2b6_batchesid ?? "");
      } else {
        setBatchId("");
      }
    }
  }, [batch, open]);

  const handleSave = () => {
    const batchData: Partial<cr2b6_batcheses> = {
      cr2b6_batchnumber: batchId.trim(),
    };

    if (batch) {
      // Editing existing batch - keep created/modified (Dataverse fields)
      if (batch.createdon) batchData.createdon = batch.createdon;
      batchData.modifiedon = new Date();
    }

    onSave(batchData);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isValid = batchId.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{batch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          <DialogContent>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <Field label="Batch ID:" required>
                <Input
                  value={batchId}
                  onChange={(_, data) => setBatchId(data.value)}
                  placeholder="Enter batch ID (e.g., B001, Batch-Alpha)"
                />
              </Field>

              {/* Color input removed: color is computed automatically */}
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={!isValid}
            >
              {batch ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
