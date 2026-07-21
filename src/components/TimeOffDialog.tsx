import { useState, useCallback, useEffect } from "react";
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
  Combobox,
  Option,
} from "@fluentui/react-components";
import type {
  DialogOpenChangeData,
  DialogOpenChangeEvent,
} from "@fluentui/react-components";
import type { Cr2b6_timeoffs } from "../generated/models/Cr2b6_timeoffsModel";
import type { Cr2b6_peoples } from "../generated/models/Cr2b6_peoplesModel";
import { TIME_OFF_TYPE_CODES } from "../services/DataProvider";
import type { TimeOffInput } from "../services/DataProvider";
import { parseDateOnly } from "../services/shiftRotation";

// Reverse-lookup from the raw numeric option-set code back to its label.
const TIME_OFF_TYPE_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(TIME_OFF_TYPE_CODES).map(([label, code]) => [code, label])
);

interface TimeOffDialogProps {
  timeOff?: Cr2b6_timeoffs;
  prefillRange?: { start: Date; end: Date };
  open: boolean;
  onOpenChange: (
    event: DialogOpenChangeEvent,
    data: DialogOpenChangeData
  ) => void;
  onSave: (input: TimeOffInput) => void;
  onDelete?: () => void;
  people: Cr2b6_peoples[];
  editMode?: boolean;
}

const TYPE_OPTIONS = ["RTO", "PTO", "Sick"];

function toDateInputValue(value?: string | Date): string {
  const d = value instanceof Date ? value : parseDateOnly(value);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const TimeOffDialog: React.FC<TimeOffDialogProps> = ({
  timeOff,
  prefillRange,
  open,
  onOpenChange,
  onSave,
  onDelete,
  people,
  editMode = true,
}) => {
  const isExisting = Boolean(timeOff?.cr2b6_timeoffid);

  const [employeeId, setEmployeeId] = useState<string>("");
  const [employeeQuery, setEmployeeQuery] = useState<string>("");
  const [type, setType] = useState<string>("PTO");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (timeOff) {
      const empId = (timeOff as any)._cr2b6_employee_value ?? "";
      setEmployeeId(empId);
      const matchedPerson = people.find((p) => p.cr2b6_peopleid === empId);
      setEmployeeQuery(
        matchedPerson?.cr2b6_fullname || timeOff.cr2b6_employeename || ""
      );
      const rawType = timeOff.cr2b6_type as unknown as number | string | undefined;
      setType(
        (typeof rawType === "number" ? TIME_OFF_TYPE_LABELS[rawType] : rawType) ??
          "PTO"
      );
      setStartDate(toDateInputValue(timeOff.cr2b6_startdate));
      setEndDate(toDateInputValue(timeOff.cr2b6_enddate));
      setNote(timeOff.cr2b6_note ?? "");
    } else {
      setEmployeeId("");
      setEmployeeQuery("");
      setType("PTO");
      setStartDate(toDateInputValue(prefillRange?.start ?? new Date()));
      setEndDate(toDateInputValue(prefillRange?.end ?? prefillRange?.start ?? new Date()));
      setNote("");
    }
  }, [timeOff, prefillRange, open, people]);

  const matchingPeople = employeeQuery.trim()
    ? people.filter((p) =>
        (p.cr2b6_fullname ?? "")
          .toLowerCase()
          .includes(employeeQuery.trim().toLowerCase())
      )
    : people;

  const handleSave = useCallback(() => {
    const input: TimeOffInput = {
      cr2b6_timeoffid: timeOff?.cr2b6_timeoffid,
      cr2b6_type: type as any,
      cr2b6_startdate: startDate ? new Date(startDate).toISOString() : undefined,
      cr2b6_enddate: endDate ? new Date(endDate).toISOString() : undefined,
      cr2b6_note: note || undefined,
      employeeId: employeeId || undefined,
      employeeLabel: employeeQuery || undefined,
    };
    onSave(input);
    const syntheticEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      target: document.body,
    } as unknown as DialogOpenChangeEvent;
    onOpenChange(syntheticEvent, {
      type: "triggerClick",
      open: false,
      event: syntheticEvent as any,
    });
  }, [timeOff, type, startDate, endDate, note, employeeId, employeeQuery, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogSurface style={{ width: "480px", maxWidth: "90vw" }}>
        <DialogTitle>{isExisting ? "Edit Time Off" : "Add Time Off"}</DialogTitle>
        <DialogBody style={{ display: "block", paddingBottom: "12px" }}>
          <div style={{ display: "grid", gap: "12px" }}>
            <Field label="Employee" required>
              <Combobox
                placeholder="Search employee"
                value={employeeQuery}
                onChange={(e) => setEmployeeQuery(e.target.value)}
                onOptionSelect={(_, data) => {
                  setEmployeeId(data.optionValue ?? "");
                  setEmployeeQuery(data.optionText ?? "");
                }}
                disabled={!editMode}
                freeform
              >
                {matchingPeople.length === 0 ? (
                  <Option value="" text="" disabled>
                    No matching employees
                  </Option>
                ) : (
                  matchingPeople.map((p) => (
                    <Option
                      key={p.cr2b6_peopleid}
                      value={p.cr2b6_peopleid}
                      text={p.cr2b6_fullname}
                    >
                      {p.cr2b6_fullname}
                    </Option>
                  ))
                )}
              </Combobox>
            </Field>

            <Field label="Type" required>
              <Dropdown
                value={type}
                selectedOptions={[type]}
                onOptionSelect={(_, data) => setType(data.optionValue ?? "PTO")}
                disabled={!editMode}
              >
                {TYPE_OPTIONS.map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Start Date" required>
              <Input
                type="date"
                value={startDate}
                onChange={(_, data) => setStartDate(data.value)}
                disabled={!editMode}
              />
            </Field>

            <Field label="End Date" required>
              <Input
                type="date"
                value={endDate}
                onChange={(_, data) => setEndDate(data.value)}
                disabled={!editMode}
              />
            </Field>

            <Field label="Note">
              <Input
                value={note}
                onChange={(_, data) => setNote(data.value)}
                disabled={!editMode}
              />
            </Field>
          </div>
        </DialogBody>
        <DialogActions style={{ display: "flex", justifyContent: "space-between" }}>
          {editMode && isExisting && onDelete && (
            <Button appearance="subtle" onClick={onDelete}>
              Delete
            </Button>
          )}
          <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            {editMode && (
              <Button appearance="primary" onClick={handleSave} disabled={!employeeId}>
                {isExisting ? "Save" : "Add"}
              </Button>
            )}
          </div>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
