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
  Textarea,
} from "@fluentui/react-components";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
// Color is auto-generated elsewhere (getBatchColor); manual selection removed.

interface BatchDialogProps {
  batch?: cr2b6_batcheses;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (batch: Partial<cr2b6_batcheses>) => void;
  existingBatches: cr2b6_batcheses[];
}

export const BatchDialog: React.FC<BatchDialogProps> = ({
  batch,
  open,
  onOpenChange,
  onSave,
  existingBatches,
}) => {
  const [batchId, setBatchId] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState("");
  // Color state removed – color is derived automatically.

  useEffect(() => {
    if (open) {
      if (batch) {
        setBatchId(batch.cr2b6_batchnumber ?? batch.cr2b6_batchesid ?? "");
        setDescription(batch.cr2b6_notes ?? "");
      } else {
        setBatchId("");
        setDescription("");
      }
    }
  }, [batch, open]);

  // Validate batch ID to prevent duplicates
  useEffect(() => {
    if (!batchId.trim()) {
      setValidationError("");
      return;
    }

    // Check if batch ID already exists (but allow editing the current batch)
    const trimmedBatchId = batchId.trim();
    const existingBatch = existingBatches.find(
      b => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === trimmedBatchId
    );
    
    // If we found an existing batch and it's not the one we're currently editing
    if (existingBatch && (!batch || existingBatch.cr2b6_batchesid !== batch.cr2b6_batchesid)) {
      setValidationError("A batch with this ID already exists");
    } else {
      setValidationError("");
    }
  }, [batchId, existingBatches, batch]);

  const handleSave = () => {
    // Don't save if there's a validation error
    if (validationError) {
      return;
    }

    const batchData: Partial<cr2b6_batcheses> = {
      cr2b6_batchnumber: batchId.trim(),
      cr2b6_notes: description.trim() || undefined,
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

  const isValid = batchId.trim().length > 0 && !validationError;

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{batch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          <DialogContent>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <Field 
                label="Batch Number:" 
                required
                validationState={validationError ? "error" : "none"}
                validationMessage={validationError}
              >
                <Input
                  value={batchId}
                  onChange={(_, data) => setBatchId(data.value)}
                  placeholder="Enter batch number (e.g., 25-HTS-01)"
                />
              </Field>

              <Field label="Description:">
                <Textarea
                  value={description}
                  onChange={(_, data) => setDescription(data.value)}
                  placeholder="Enter batch description or notes"
                  rows={3}
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
