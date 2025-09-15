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
  Divider,
} from "@fluentui/react-components";
import type { cr2b6_systems } from "../generated/models/cr2b6_systemsModel";
import { useState, useCallback, useEffect, MouseEvent } from "react";

import type {
  DialogOpenChangeData,
  DialogOpenChangeEvent,
} from "@fluentui/react-components";

interface EquipmentDialogProps {
  equipment?: cr2b6_systems;
  open: boolean;
  onOpenChange: (
    event: DialogOpenChangeEvent,
    data: DialogOpenChangeData
  ) => void;
  onSave: (equipment: Partial<cr2b6_systems>) => void;
}

export const EquipmentDialog: React.FC<EquipmentDialogProps> = ({
  equipment,
  open,
  onOpenChange,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<cr2b6_systems>>(
    equipment ?? {
      cr2b6_tag: "",
      cr2b6_description: "",
      owningbusinessunitname: "Default BU",
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      createdbyyominame: "",
      createdonbehalfbyyominame: "",
      modifiedbyyominame: "",
      modifiedonbehalfbyyominame: "",
      statecode: "0",
    }
  );

  // Update form data when equipment changes
  useEffect(() => {
    if (equipment) {
      setFormData(equipment);
    } else {
      setFormData({
        cr2b6_tag: "",
        cr2b6_description: "",
        owningbusinessunitname: "Default BU",
        ownerid: "system",
        owneridname: "System",
        owneridtype: "systemuser",
        owneridyominame: "",
        createdbyyominame: "",
        createdonbehalfbyyominame: "",
        modifiedbyyominame: "",
        modifiedonbehalfbyyominame: "",
        statecode: "0",
      });
    }
  }, [equipment]);

  const handleChange = useCallback((field: keyof cr2b6_systems, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = () => {
    setFormData({
      cr2b6_tag: "",
      cr2b6_description: "",
      owningbusinessunitname: "Default BU",
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      createdbyyominame: "",
      createdonbehalfbyyominame: "",
      modifiedbyyominame: "",
      modifiedonbehalfbyyominame: "",
      statecode: "0",
    });
  };

  const handleSave = useCallback(() => {
    onSave(formData);
    // After save, always clear form so a new Add starts blank
    resetForm();
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

  // Deletion disabled for equipment — only create and edit allowed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogSurface>
        <DialogTitle>
          {equipment ? "Edit Equipment" : "Add Equipment"}
        </DialogTitle>
        <DialogBody>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Field label="Tag" required>
              <Input
                value={(formData as any).cr2b6_tag || ""}
                onChange={(e) =>
                  handleChange("cr2b6_tag", e.target.value as any)
                }
              />
            </Field>
            <Field label="Description" required>
              <Input
                value={(formData as any).cr2b6_description || ""}
                onChange={(e) =>
                  handleChange("cr2b6_description", e.target.value as any)
                }
              />
            </Field>
          </div>
        </DialogBody>
        <Divider />
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary">Cancel</Button>
          </DialogTrigger>
          {/* Delete disabled — only create and edit allowed */}
          <Button appearance="primary" onClick={handleSave}>
            {equipment ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
