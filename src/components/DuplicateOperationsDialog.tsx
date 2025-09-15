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
  Dropdown,
  Option,
  Label,
} from "@fluentui/react-components";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";

interface DuplicateOperationsDialogProps {
  open: boolean;
  operationIds: string[];
  batches: cr2b6_batcheses[];
  onOpenChange: (open: boolean) => void;
  onDuplicate: (batchId: string | null) => void;
}

export const DuplicateOperationsDialog: React.FC<
  DuplicateOperationsDialogProps
> = ({ open, operationIds, batches, onOpenChange, onDuplicate }) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedBatchId(null);
    }
  }, [open]);

  const handleDuplicate = () => {
    onDuplicate(selectedBatchId);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Duplicate Operations</DialogTitle>
          <DialogContent>
            <div style={{ marginBottom: "16px" }}>
              <Label>
                Duplicating {operationIds.length} operation
                {operationIds.length > 1 ? "s" : ""}
              </Label>
            </div>
            <Field label="Batch for duplicated operations:">
              <Dropdown
                placeholder="Select a batch (or leave empty for no batch)"
                value={
                  selectedBatchId
                    ? batches.find(
                        (b) =>
                          (b.cr2b6_batchnumber || b.cr2b6_batchesid) ===
                          selectedBatchId
                      )?.cr2b6_batchnumber || ""
                    : ""
                }
                selectedOptions={selectedBatchId ? [selectedBatchId] : []}
                onOptionSelect={(_, data) => {
                  setSelectedBatchId(data.optionValue || null);
                }}
                clearable
              >
                {batches.map((batch) => {
                  const bid =
                    batch.cr2b6_batchnumber || batch.cr2b6_batchesid || "";
                  return (
                    <Option key={bid} value={bid} text={`Batch ${bid}`}>
                      Batch {bid}
                    </Option>
                  );
                })}
              </Dropdown>
            </Field>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={handleDuplicate}>
              Duplicate
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
