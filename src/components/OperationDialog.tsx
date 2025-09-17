import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
  Input,
  Field,
  Dropdown,
  Option,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
import type { cr2b6_systems } from "../generated/models/cr2b6_systemsModel";
import type { cr2b6_operations } from "../generated/models/cr2b6_operationsModel";
import { useState, useCallback, useEffect, MouseEvent } from "react";

import type {
  DialogOpenChangeData,
  DialogOpenChangeEvent,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  auditSection: {
    marginTop: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  auditGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingVerticalS,
  },
  auditLabel: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  auditValue: {
    color: tokens.colorNeutralForeground1,
  },
});

interface OperationDialogProps {
  operation?: cr2b6_operations;
  open: boolean;
  onOpenChange: (
    event: DialogOpenChangeEvent,
    data: DialogOpenChangeData
  ) => void;
  onSave: (operation: Partial<cr2b6_operations>) => void;
  onDelete?: () => void;
  equipment: cr2b6_systems[];
  batches: cr2b6_batcheses[];
  editMode?: boolean;
}

export const OperationDialog: React.FC<OperationDialogProps> = ({
  operation,
  open,
  onOpenChange,
  onSave,
  onDelete,
  equipment,
  batches,
  editMode = true,
}) => {
  const styles = useStyles();
  const [formData, setFormData] = useState<Partial<cr2b6_operations>>(
    operation ?? {
      cr2b6_system: "",
      cr2b6_batch: undefined,
      cr2b6_starttime: new Date(),
      cr2b6_endtime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      cr2b6_type: "Production",
      cr2b6_description: "",
    }
  );

  // Update form data when operation changes
  useEffect(() => {
    if (operation) {
      // Convert numeric option set values back to text labels for the dropdown
      const getTypeLabel = (numericType: any): string => {
        if (typeof numericType === "string") return numericType;
        const typeMap: Record<number, string> = {
          566210000: "Production",
          566210001: "Maintenance",
          566210002: "Engineering",
          566210003: "Miscellaneous",
        };
        return typeMap[numericType] || "Production";
      };

      setFormData({
        ...operation,
        // Use the actual lookup value from Dataverse
        cr2b6_system:
          (operation as any)._cr2b6_system_value || operation.cr2b6_system,
        cr2b6_batch:
          (operation as any)._cr2b6_batch_value || operation.cr2b6_batch,
        // Convert numeric type back to text label
        cr2b6_type: getTypeLabel(operation.cr2b6_type),
        // Convert string dates from Dataverse to Date objects
        cr2b6_starttime: operation.cr2b6_starttime
          ? new Date(operation.cr2b6_starttime)
          : new Date(),
        cr2b6_endtime: operation.cr2b6_endtime
          ? new Date(operation.cr2b6_endtime)
          : new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
    } else {
      setFormData({
        cr2b6_system: "",
        cr2b6_batch: undefined,
        cr2b6_starttime: new Date(),
        cr2b6_endtime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        cr2b6_type: "Production",
        cr2b6_description: "",
      });
    }
  }, [operation]);

  const handleChange = useCallback(
    (field: keyof cr2b6_operations, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSave = useCallback(() => {
    onSave(formData);
    const syntheticEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      target: document.body,
    } as unknown as MouseEvent<HTMLElement>;
    onOpenChange(syntheticEvent, {
      type: "triggerClick",
      open: false,
      event: syntheticEvent,
    });
  }, [formData, onSave, onOpenChange]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete();
    }
  }, [onDelete]);

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTime = (date: Date | string | undefined): string => {
    if (!date) return "Not available";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseDateTime = (value: string): Date => {
    return new Date(value);
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogSurface style={{ width: "600px", maxWidth: "90vw" }}>
          <DialogTitle>
            {editMode
              ? operation
                ? "Edit Operation"
                : "Add Operation"
              : "View Operation"}
          </DialogTitle>
          <DialogBody style={{ display: "block", paddingBottom: "12px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                alignItems: "start",
              }}
            >
              <Field label="Equipment" required>
                <Dropdown
                  placeholder="Select equipment"
                  value={
                    equipment.find(
                      (sys) => sys.cr2b6_systemid === formData.cr2b6_system
                    )?.cr2b6_description || ""
                  }
                  onOptionSelect={(_, data) =>
                    handleChange("cr2b6_system", data.optionValue)
                  }
                  disabled={!editMode}
                >
                  {equipment.map((sys) => (
                    <Option
                      key={sys.cr2b6_systemid}
                      value={sys.cr2b6_systemid}
                      text={`${sys.cr2b6_description} (${
                        sys.cr2b6_tag ?? "-"
                      })`}
                    >
                      {sys.cr2b6_description} ({sys.cr2b6_tag ?? "-"})
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <Field label="Start Time" required>
                <Input
                  type="datetime-local"
                  value={
                    formData.cr2b6_starttime
                      ? formatDateTimeLocal(formData.cr2b6_starttime)
                      : ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "cr2b6_starttime",
                      parseDateTime(e.target.value)
                    )
                  }
                  disabled={!editMode}
                />
              </Field>

              <Field label="Batch">
                <Dropdown
                  placeholder="Select batch (optional)"
                  value={
                    batches.find(
                      (batch) => batch.cr2b6_batchesid === formData.cr2b6_batch
                    )?.cr2b6_batchnumber ?? ""
                  }
                  onOptionSelect={(_, data) =>
                    handleChange(
                      "cr2b6_batch",
                      data.optionValue === ""
                        ? undefined
                        : (data.optionValue as string)
                    )
                  }
                  disabled={!editMode}
                >
                  <Option value="" text="No Batch">
                    No Batch
                  </Option>
                  {batches.map((batch) => {
                    const bid = batch.cr2b6_batchesid ?? "";
                    return (
                      <Option key={bid} value={bid} text={String(bid)}>
                        {String(batch.cr2b6_batchnumber ?? bid)}
                      </Option>
                    );
                  })}
                </Dropdown>
              </Field>

              <Field label="End Time" required>
                <Input
                  type="datetime-local"
                  value={
                    formData.cr2b6_endtime
                      ? formatDateTimeLocal(formData.cr2b6_endtime)
                      : ""
                  }
                  onChange={(e) =>
                    handleChange("cr2b6_endtime", parseDateTime(e.target.value))
                  }
                  disabled={!editMode}
                />
              </Field>

              <Field label="Type" required>
                <Dropdown
                  placeholder="Select operation type"
                  value={formData.cr2b6_type || ""}
                  onOptionSelect={(_, data) =>
                    handleChange("cr2b6_type", data.optionValue)
                  }
                  disabled={!editMode}
                >
                  <Option value="Production" text="Production">
                    Production
                  </Option>
                  <Option value="Maintenance" text="Maintenance">
                    Maintenance
                  </Option>
                  <Option value="Engineering" text="Engineering">
                    Engineering
                  </Option>
                  <Option value="Miscellaneous" text="Miscellaneous">
                    Miscellaneous
                  </Option>
                </Dropdown>
              </Field>

              <Field label="Description" required>
                <Input
                  value={formData.cr2b6_description || ""}
                  onChange={(e) =>
                    handleChange("cr2b6_description", e.target.value)
                  }
                  disabled={!editMode}
                />
              </Field>
            </div>

            {/* Audit Information Section - Show only for existing operations in read-only mode */}
            {operation && !editMode && (
              <div className={styles.auditSection}>

                <div className={styles.auditGrid}>
                  <div>
                    <Text className={styles.auditLabel}>Created On: </Text>
                    <Text className={styles.auditValue}>{formatDateTime(operation.createdon)}</Text>
                  </div>
                  <div>
                    <Text className={styles.auditLabel}>Created By: </Text>
                    <Text className={styles.auditValue}>{operation.createdbyname || ""}</Text>
                  </div>
                  <div>
                    <Text className={styles.auditLabel}>Modified On: </Text>
                    <Text className={styles.auditValue}>{formatDateTime(operation.modifiedon)}</Text>
                  </div>
                  <div>
                    <Text className={styles.auditLabel}>Modified By: </Text>
                    <Text className={styles.auditValue}>{operation.modifiedbyname || ""}</Text>
                  </div>
                </div>
              </div>
            )}
          </DialogBody>
          {/* <Divider /> */}
          <DialogActions
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            {editMode && operation && onDelete && (
              <Button appearance="subtle" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              {editMode && (
                <Button appearance="primary" onClick={handleSave}>
                  {operation ? "Save" : "Add"}
                </Button>
              )}
            </div>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </>
  );
};
