import { tokens } from "@fluentui/react-components";
import { useEffect } from "react";

export interface FermenterState {
  active: boolean;
  operationDescription?: string;
}

export interface EquipmentMapping {
  label: string;
  x: number;
  y: number;
  radius?: number;
}

export interface FermenterMapProps {
  // Map like { '3A': {active, operationDescription}, ... }
  activeByLabel: Record<string, FermenterState>;
  // Dynamic equipment positions
  equipmentMappings: EquipmentMapping[];
  width?: number | string;
  height?: number | string;
}

export default function FermenterMap({
  activeByLabel,
  equipmentMappings,
  width = "100%",
  height = 220,
}: FermenterMapProps) {
  const activeFill = tokens.colorPaletteGreenBackground3;
  const idleFill = tokens.colorNeutralBackground3;
  const stroke = "#999";

  const getInfo = (label: string): FermenterState =>
    activeByLabel[label] ?? { active: false };
  const getFill = (label: string) =>
    getInfo(label).active ? activeFill : idleFill;

  // Calculate viewBox based on equipment positions
  const viewBox = (() => {
    if (equipmentMappings.length === 0) return "0 0 720 200";

    const positions = equipmentMappings.map((eq) => ({
      x: eq.x,
      y: eq.y,
      r: eq.radius || 40,
    }));

    const minX = Math.min(...positions.map((p) => p.x - p.r)) - 20;
    const maxX = Math.max(...positions.map((p) => p.x + p.r)) + 20;
    const minY = Math.min(...positions.map((p) => p.y - p.r)) - 20;
    const maxY = Math.max(...positions.map((p) => p.y + p.r)) + 20;

    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  })();

  // Debugging: log whenever active state changes
  useEffect(() => {
    const ordered: Record<string, FermenterState> = {};
    equipmentMappings.forEach((eq) => (ordered[eq.label] = getInfo(eq.label)));
    console.log("FermenterMap activeByLabel:", ordered);
    console.log("FermenterMap equipmentMappings:", equipmentMappings);
  }, [activeByLabel, equipmentMappings]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={width}
      height={height}
    >
      <title>Equipment Floor Plan</title>
      <g
        fontFamily="Segoe UI, Arial, sans-serif"
        fontSize={20}
        fill="#333"
        textAnchor="middle"
      >
        {equipmentMappings.map((equipment) => {
          const { label, x, y, radius = 40 } = equipment;
          const info = getInfo(label);

          return (
            <g key={label}>
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={getFill(label)}
                stroke={stroke}
                strokeWidth={2}
                style={{ cursor: "pointer" }}
              >
                {info.operationDescription && (
                  <title>{`${label}: ${info.operationDescription}`}</title>
                )}
              </circle>
              <text x={x} y={y + 5} fontSize={16} fontWeight="bold">
                {label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
