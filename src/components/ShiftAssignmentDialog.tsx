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
import type { Cr2b6_shiftassignments } from "../generated/models/Cr2b6_shiftassignmentsModel";
import type { Cr2b6_peoples } from "../generated/models/Cr2b6_peoplesModel";
import { SHIFT_CODES } from "../services/DataProvider";
import type { ShiftAssignmentInput } from "../services/DataProvider";
import { parseDateOnly } from "../services/shiftRotation";

// Reverse-lookup from the raw numeric option-set code back to its letter.
const SHIFT_CODE_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(SHIFT_CODES).map(([label, code]) => [code, label])
);

interface ShiftAssignmentDialogProps {
  assignment?: Cr2b6_shiftassignments;
  prefillCrew?: string;
  open: boolean;
  onOpenChange: (
    event: DialogOpenChangeEvent,
    data: DialogOpenChangeData
  ) => void;
  onSave: (input: ShiftAssignmentInput) => void;
  onDelete?: () => void;
  people: Cr2b6_peoples[];
  editMode?: boolean;
}

const CREW_OPTIONS = ["A", "B", "C", "D"];

function toDateInputValue(value?: string | Date): string {
  const d = value instanceof Date ? value : parseDateOnly(value);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const ShiftAssignmentDialog: React.FC<ShiftAssignmentDialogProps> = ({
  assignment,
  prefillCrew,
  open,
  onOpenChange,
  onSave,
  onDelete,
  people,
  editMode = true,
}) => {
  const isExisting = Boolean(assignment?.cr2b6_shiftassignmentid);

  const [employeeId, setEmployeeId] = useState<string>("");
  const [employeeQuery, setEmployeeQuery] = useState<string>("");
  const [crew, setCrew] = useState<string>(prefillCrew ?? "A");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (assignment) {
      const empId = (assignment as any)._cr2b6_employee_value ?? "";
      setEmployeeId(empId);
      const matchedPerson = people.find((p) => p.cr2b6_peopleid === empId);
      setEmployeeQuery(
        matchedPerson?.cr2b6_fullname || assignment.cr2b6_employeename || ""
      );
      const rawShift = assignment.cr2b6_shift as unknown as number | string | undefined;
      setCrew(
        (typeof rawShift === "number" ? SHIFT_CODE_LABELS[rawShift] : rawShift) ??
          prefillCrew ??
          "A"
      );
      setStartDate(toDateInputValue(assignment.cr2b6_startdate));
      setEndDate(toDateInputValue(assignment.cr2b6_enddate));
      setNote(assignment.cr2b6_note ?? "");
    } else {
      setEmployeeId("");
      setEmployeeQuery("");
      setCrew(prefillCrew ?? "A");
      setStartDate(toDateInputValue(new Date()));
      setEndDate("");
      setNote("");
    }
  }, [assignment, prefillCrew, open, people]);

  const matchingPeople = employeeQuery.trim()
    ? people.filter((p) =>
        (p.cr2b6_fullname ?? "")
          .toLowerCase()
          .includes(employeeQuery.trim().toLowerCase())
      )
    : people;

  const handleSave = useCallback(() => {
    const input: ShiftAssignmentInput = {
      cr2b6_shiftassignmentid: assignment?.cr2b6_shiftassignmentid,
      cr2b6_shift: crew as any,
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
  }, [assignment, crew, startDate, endDate, note, employeeId, employeeQuery, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogSurface style={{ width: "480px", maxWidth: "90vw" }}>
        <DialogTitle>
          {isExisting ? "Edit Shift Assignment" : "Add Shift Assignment"}
        </DialogTitle>
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

            <Field label="Crew" required>
              <Dropdown
                value={crew}
                selectedOptions={[crew]}
                onOptionSelect={(_, data) => setCrew(data.optionValue ?? "A")}
                disabled={!editMode}
              >
                {CREW_OPTIONS.map((c) => (
                  <Option key={c} value={c}>
                    {c}
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

            <Field label="End Date" hint="Leave blank if this assignment is ongoing">
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
