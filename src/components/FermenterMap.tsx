import { tokens } from "@fluentui/react-components";
import { useEffect } from "react";

export interface FermenterState {
  active: boolean;
  operationDescription?: string;
}

export interface FermenterMapProps {
  // Map like { '3A': {active, operationDescription}, ... }
  activeByLabel: Record<string, FermenterState>;
  width?: number | string;
  height?: number | string;
}

export default function FermenterMap({ activeByLabel, width = "100%", height = 220 }: FermenterMapProps) {
  const activeFill = tokens.colorPaletteGreenBackground3;
  const idleFill = tokens.colorNeutralBackground3;
  const stroke = "#999";

  const getInfo = (label: string): FermenterState => activeByLabel[label] ?? { active: false };
  const getFill = (label: string) => (getInfo(label).active ? activeFill : idleFill);

  // Debugging: log whenever active state changes
  useEffect(() => {
    // Pretty-print in stable tag order
    const ordered: Record<string, FermenterState> = {};
    ["3A","3B","3C","3D","3E","3F"].forEach(t => ordered[t] = getInfo(t));
    console.log("FermenterMap activeByLabel:", ordered);
  }, [activeByLabel]);

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" width={width} height={height}>
      <title>Fermenters 3A-3F</title>
      <g fontFamily="Segoe UI, Arial, sans-serif" fontSize={20} fill="#333" textAnchor="middle">
        {/* Single row: evenly spaced across width */}
        <circle cx={60} cy={100} r={40} fill={getFill("3A")} stroke={stroke} strokeWidth={2}>
          {getInfo("3A").operationDescription ? <title>{getInfo("3A").operationDescription}</title> : null}
        </circle>
        <text x={60} y={105}>3A</text>

        <circle cx={180} cy={100} r={40} fill={getFill("3B")} stroke={stroke} strokeWidth={2}>
          {getInfo("3B").operationDescription ? <title>{getInfo("3B").operationDescription}</title> : null}
        </circle>
        <text x={180} y={105}>3B</text>

        <circle cx={300} cy={100} r={40} fill={getFill("3C")} stroke={stroke} strokeWidth={2}>
          {getInfo("3C").operationDescription ? <title>{getInfo("3C").operationDescription}</title> : null}
        </circle>
        <text x={300} y={105}>3C</text>

        <circle cx={420} cy={100} r={40} fill={getFill("3D")} stroke={stroke} strokeWidth={2}>
          {getInfo("3D").operationDescription ? <title>{getInfo("3D").operationDescription}</title> : null}
        </circle>
        <text x={420} y={105}>3D</text>

        <circle cx={540} cy={100} r={40} fill={getFill("3E")} stroke={stroke} strokeWidth={2}>
          {getInfo("3E").operationDescription ? <title>{getInfo("3E").operationDescription}</title> : null}
        </circle>
        <text x={540} y={105}>3E</text>

        <circle cx={660} cy={100} r={40} fill={getFill("3F")} stroke={stroke} strokeWidth={2}>
          {getInfo("3F").operationDescription ? <title>{getInfo("3F").operationDescription}</title> : null}
        </circle>
        <text x={660} y={105}>3F</text>
      </g>
    </svg>
  );
}
