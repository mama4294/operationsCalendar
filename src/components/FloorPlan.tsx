import {
  Text,
  Input,
  makeStyles,
  tokens,
  Spinner,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Field,
  Dropdown,
  Option,
  Badge,
} from "@fluentui/react-components";
import {
  Map24Regular,
  Settings24Regular,
  Add24Regular,
  Delete24Regular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import FermenterMap, { FermenterState, EquipmentMapping } from "./FermenterMap";
import { dataProvider } from "../services/DataProvider";
import type { cr2b6_systems } from "../generated/models/cr2b6_systemsModel";
import type { cr2b6_operations } from "../generated/models/cr2b6_operationsModel";
import { usePowerReady } from "../PowerProvider";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: tokens.spacingVerticalM,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    justifyContent: "space-between",
    flexWrap: "nowrap",
    minHeight: "56px",
  },
  content: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    padding: tokens.spacingVerticalM,
  },
  placeholder: {
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

export default function FloorPlan() {
  const styles = useStyles();
  const powerReady = usePowerReady();
  // format current datetime to yyyy-MM-ddTHH:mm (no seconds)
  const getNowLocal = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  const [selectedDateTime, setSelectedDateTime] = useState<string>(
    getNowLocal()
  );
  const [equipment, setEquipment] = useState<cr2b6_systems[]>([]);
  const [operations, setOperations] = useState<cr2b6_operations[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [customEquipmentMappings, setCustomEquipmentMappings] = useState<
    EquipmentMapping[]
  >([]);

  // Helper functions
  const normalizeId = (id?: string) =>
    id ? id.replace(/[{}]/g, "").toLowerCase() : "";

  // Extract label from description (e.g., "3A fermenter" -> "3A")
  const getLabelFromDescription = (desc?: string) => {
    const d = (desc || "").trim().toUpperCase();
    // take leading token before first space
    const first = d.split(/\s+/)[0] || "";
    // normalize like 3A, 3B...
    return first.replace(/[^0-9A-Z]/g, "");
  };

  // Generate equipment mappings based on available equipment
  const generateEquipmentMappings = (
    availableEquipment: cr2b6_systems[]
  ): EquipmentMapping[] => {
    const mappings: EquipmentMapping[] = [];
    const equipmentLabels = availableEquipment
      .map((eq) => getLabelFromDescription(eq.cr2b6_description))
      .filter((label) => label.length > 0)
      .sort(); // Sort to ensure consistent positioning

    // Arrange equipment in a grid layout
    const itemsPerRow = Math.ceil(Math.sqrt(equipmentLabels.length));
    const spacing = 120; // Space between items
    const radius = 40;
    const startX = radius + 20; // Offset from edge
    const startY = radius + 20;

    equipmentLabels.forEach((label, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;

      mappings.push({
        label,
        x: startX + col * spacing,
        y: startY + row * spacing,
        radius,
      });
    });

    return mappings;
  };

  // Equipment mappings based on available equipment
  const equipmentMappings = useMemo(() => {
    // Use custom mappings if available, otherwise auto-generate
    return customEquipmentMappings.length > 0
      ? customEquipmentMappings
      : generateEquipmentMappings(equipment);
  }, [equipment, customEquipmentMappings]);

  // Load equipment and operations when SDK is ready
  useEffect(() => {
    if (!powerReady) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [eq, ops] = await Promise.all([
          dataProvider.getEquipment(),
          // getOperations currently returns all; pass dummy dates
          dataProvider.getOperations(new Date(0), new Date()),
        ]);
        if (!cancelled) {
          setEquipment(eq);
          setOperations(ops);

          // Log equipment detection for debugging
          console.log(
            "Equipment loaded:",
            eq.map((e) => ({
              id: e.cr2b6_systemid,
              description: e.cr2b6_description,
              extractedLabel: getLabelFromDescription(e.cr2b6_description),
            }))
          );

          console.log(
            "Operations loaded:",
            ops.map((o) => ({
              id: o.cr2b6_operationid,
              description: o.cr2b6_description,
              system: o.cr2b6_system,
              systemLookup: (o as any)._cr2b6_system_value,
              startTime: o.cr2b6_starttime,
              endTime: o.cr2b6_endtime,
            }))
          );
        }
      } catch (e) {
        // Soft-fail: keep placeholders
        console.error("FloorPlan data load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [powerReady]);

  const selectedDate = useMemo(
    () => new Date(selectedDateTime),
    [selectedDateTime]
  );

  const equipmentByLabel = useMemo(() => {
    const map = new Map<string, cr2b6_systems>();
    for (const eq of equipment) {
      const label = getLabelFromDescription(eq.cr2b6_description);
      if (label) map.set(label, eq);
    }
    return map;
  }, [equipment]);

  const activeByLabel: Record<string, FermenterState> = useMemo(() => {
    const result: Record<string, FermenterState> = {};
    const time = selectedDate.getTime();

    console.log("=== FloorPlan activeByLabel calculation ===");
    console.log("Selected time:", new Date(time).toISOString());
    console.log("Equipment mappings:", equipmentMappings);
    console.log("Total operations:", operations.length);
    console.log(
      "Equipment by label map:",
      Array.from(equipmentByLabel.entries())
    );

    for (const mapping of equipmentMappings) {
      const { label } = mapping;
      const eq = equipmentByLabel.get(label);

      console.log(`\n--- Processing equipment ${label} ---`);

      if (!eq) {
        console.log(`No equipment found for label: ${label}`);
        result[label] = { active: false };
        continue;
      }

      console.log(`Equipment found:`, {
        id: eq.cr2b6_systemid,
        description: eq.cr2b6_description,
      });

      const eqId = normalizeId(eq.cr2b6_systemid as any);
      console.log(`Normalized equipment ID: ${eqId}`);

      // find an overlapping operation for this system
      const matchingOps = operations.filter((op) => {
        // Check both the direct system field and the lookup value
        const opSysValue = normalizeId(
          (op as any)._cr2b6_system_value || op.cr2b6_system
        );
        const opSysDirect = normalizeId(op.cr2b6_system);

        console.log(
          `Comparing operation systems: lookup=${opSysValue}, direct=${opSysDirect} vs equipment: ${eqId}`
        );
        return opSysValue === eqId || opSysDirect === eqId;
      });

      console.log(`Found ${matchingOps.length} operations for this equipment`);

      const op = matchingOps.find((op) => {
        const start = op.cr2b6_starttime
          ? new Date(op.cr2b6_starttime).getTime()
          : Number.NEGATIVE_INFINITY;
        const end = op.cr2b6_endtime
          ? new Date(op.cr2b6_endtime).getTime()
          : Number.POSITIVE_INFINITY;
        const isActive = start <= time && time <= end;

        console.log(`Operation time check:`, {
          description: op.cr2b6_description,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          currentTime: new Date(time).toISOString(),
          isActive,
        });

        return isActive;
      });

      result[label] = {
        active: !!op,
        operationDescription: op?.cr2b6_description,
      };

      console.log(`Final result for ${label}:`, result[label]);
    }

    console.log("=== Final activeByLabel result ===", result);
    return result;
  }, [equipmentByLabel, operations, selectedDate, equipmentMappings]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: tokens.spacingHorizontalM,
          }}
        >
          <Map24Regular />
          <Text size={500} weight="semibold">
            Floor Plan
          </Text>
          {equipment.length > 0 && (
            <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
              ({equipmentMappings.length} equipment detected)
            </Text>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: tokens.spacingHorizontalS,
          }}
        >
          {/* Equipment Configuration Button */}
          <Button
            icon={<Settings24Regular />}
            size="small"
            appearance="subtle"
            onClick={() => setIsConfigDialogOpen(true)}
            title="Configure Equipment Mapping"
          >
            Configure
          </Button>

          {/* Date/Time picker (Fluent UI Input using native datetime-local) */}
          <Input
            type="datetime-local"
            size="small"
            value={selectedDateTime}
            onChange={(e) =>
              setSelectedDateTime((e.target as HTMLInputElement).value)
            }
            style={{ maxWidth: 240 }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {loading ? (
          <Spinner label="Loading floor plan data" />
        ) : (
          <div
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <FermenterMap
              activeByLabel={activeByLabel}
              equipmentMappings={equipmentMappings}
              width={"100%"}
              height={320}
            />
          </div>
        )}
      </div>

      {/* Equipment Configuration Dialog */}
      <Dialog
        open={isConfigDialogOpen}
        onOpenChange={(_, data) => setIsConfigDialogOpen(data.open)}
      >
        <DialogSurface style={{ maxWidth: "800px", width: "90vw" }}>
          <DialogBody>
            <DialogTitle>Configure Equipment Mapping</DialogTitle>
            <DialogContent>
              <EquipmentMappingConfiguration
                equipment={equipment}
                currentMappings={equipmentMappings}
                onMappingsChange={setCustomEquipmentMappings}
              />
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button
                  appearance="secondary"
                  onClick={() => setIsConfigDialogOpen(false)}
                >
                  Cancel
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={() => setIsConfigDialogOpen(false)}
              >
                Save
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

// Equipment Mapping Configuration Component
interface EquipmentMappingConfigurationProps {
  equipment: cr2b6_systems[];
  currentMappings: EquipmentMapping[];
  onMappingsChange: (mappings: EquipmentMapping[]) => void;
}

function EquipmentMappingConfiguration({
  equipment,
  currentMappings,
  onMappingsChange,
}: EquipmentMappingConfigurationProps) {
  const [editingMappings, setEditingMappings] = useState<EquipmentMapping[]>(
    currentMappings.length > 0 ? [...currentMappings] : []
  );

  // Extract label from description (same logic as parent)
  const getLabelFromDescription = (desc?: string) => {
    const d = (desc || "").trim().toUpperCase();
    const first = d.split(/\s+/)[0] || "";
    return first.replace(/[^0-9A-Z]/g, "");
  };

  // Available equipment options for dropdown
  const availableEquipment = equipment.map((eq) => ({
    id: eq.cr2b6_systemid,
    description: eq.cr2b6_description || "Unnamed Equipment",
    label: getLabelFromDescription(eq.cr2b6_description),
  }));

  const addNewMapping = () => {
    const newMapping: EquipmentMapping = {
      label: "",
      x: 100 + editingMappings.length * 120,
      y: 100,
      radius: 40,
    };
    const newMappings = [...editingMappings, newMapping];
    setEditingMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const removeMapping = (index: number) => {
    const newMappings = editingMappings.filter((_, i) => i !== index);
    setEditingMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const updateMapping = (
    index: number,
    field: keyof EquipmentMapping,
    value: string | number
  ) => {
    const newMappings = [...editingMappings];
    if (field === "x" || field === "y" || field === "radius") {
      newMappings[index] = { ...newMappings[index], [field]: Number(value) };
    } else {
      newMappings[index] = { ...newMappings[index], [field]: value as string };
    }
    setEditingMappings(newMappings);
    onMappingsChange(newMappings);
  };

  // Auto-generate mappings based on available equipment
  const autoGenerate = () => {
    const equipmentLabels = availableEquipment
      .map((eq) => eq.label)
      .filter((label) => label.length > 0)
      .sort();

    const itemsPerRow = Math.ceil(Math.sqrt(equipmentLabels.length));
    const spacing = 120;
    const radius = 40;
    const startX = radius + 20;
    const startY = radius + 20;

    const newMappings: EquipmentMapping[] = equipmentLabels.map(
      (label, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;

        return {
          label,
          x: startX + col * spacing,
          y: startY + row * spacing,
          radius,
        };
      }
    );

    setEditingMappings(newMappings);
    onMappingsChange(newMappings);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
      }}
    >
      <Text size={300}>
        Map your equipment to positions on the floor plan. Equipment labels are
        automatically extracted from descriptions.
      </Text>

      <div
        style={{
          display: "flex",
          gap: tokens.spacingHorizontalS,
          marginBottom: tokens.spacingVerticalM,
        }}
      >
        <Button icon={<Add24Regular />} size="small" onClick={addNewMapping}>
          Add Equipment
        </Button>
        <Button size="small" appearance="secondary" onClick={autoGenerate}>
          Auto-Generate from Available Equipment
        </Button>
      </div>

      {availableEquipment.length > 0 && (
        <div style={{ marginBottom: tokens.spacingVerticalM }}>
          <Text size={300} weight="semibold">
            Available Equipment:
          </Text>
          <div
            style={{
              display: "flex",
              gap: tokens.spacingHorizontalXS,
              flexWrap: "wrap",
              marginTop: tokens.spacingVerticalXS,
              padding: tokens.spacingVerticalS,
              backgroundColor: tokens.colorNeutralBackground2,
              borderRadius: tokens.borderRadiusSmall,
            }}
          >
            {availableEquipment.map((eq) => (
              <Badge key={eq.id} size="small" appearance="outline">
                {eq.label}: {eq.description}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {editingMappings.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: tokens.spacingVerticalS,
          }}
        >
          <Text size={300} weight="semibold">
            Equipment Mappings:
          </Text>
          {editingMappings.map((mapping, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: tokens.spacingHorizontalS,
                alignItems: "center",
                padding: tokens.spacingVerticalS,
                backgroundColor: tokens.colorNeutralBackground2,
                borderRadius: tokens.borderRadiusSmall,
              }}
            >
              <Field label="Equipment">
                <Dropdown
                  value={mapping.label}
                  onOptionSelect={(_, data) => {
                    if (data.optionValue) {
                      updateMapping(index, "label", data.optionValue);
                    }
                  }}
                  style={{ minWidth: "200px" }}
                >
                  <Option value="" text="Select Equipment...">
                    Select Equipment...
                  </Option>
                  {availableEquipment.map((eq) => (
                    <Option
                      key={eq.id}
                      value={eq.label}
                      text={`${eq.label} - ${eq.description}`}
                    >
                      {eq.label} - {eq.description}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <Field label="X Position">
                <Input
                  type="number"
                  value={mapping.x.toString()}
                  onChange={(e) => updateMapping(index, "x", e.target.value)}
                  style={{ width: "80px" }}
                />
              </Field>

              <Field label="Y Position">
                <Input
                  type="number"
                  value={mapping.y.toString()}
                  onChange={(e) => updateMapping(index, "y", e.target.value)}
                  style={{ width: "80px" }}
                />
              </Field>

              <Field label="Size">
                <Input
                  type="number"
                  value={(mapping.radius || 40).toString()}
                  onChange={(e) =>
                    updateMapping(index, "radius", e.target.value)
                  }
                  style={{ width: "60px" }}
                />
              </Field>

              <Button
                icon={<Delete24Regular />}
                size="small"
                appearance="subtle"
                onClick={() => removeMapping(index)}
                title="Remove this mapping"
                style={{ marginTop: "20px" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: tokens.spacingVerticalL,
            textAlign: "center",
            color: tokens.colorNeutralForeground3,
            backgroundColor: tokens.colorNeutralBackground2,
            borderRadius: tokens.borderRadiusSmall,
          }}
        >
          <Text>
            No equipment mappings configured. Click "Add Equipment" or
            "Auto-Generate" to get started.
          </Text>
        </div>
      )}
    </div>
  );
}
