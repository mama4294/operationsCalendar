import React, { useEffect, useState } from "react";
import {
  Text,
  makeStyles,
  shorthands,
  tokens,
  FluentProvider,
  webLightTheme,
  Card,
  Badge,
  Button,
} from "@fluentui/react-components";
import { CodeRegular, HeartRegular } from "@fluentui/react-icons";
import { usePowerReady } from "./PowerProvider";
import { cr2b6_systemsService } from "./generated/services/cr2b6_systemsService";
import { cr2b6_operationsService } from "./generated/services/cr2b6_operationsService";
import { cr2b6_batchesesService } from "./generated/services/cr2b6_batchesesService";
import type { cr2b6_systems } from "./generated/models/cr2b6_systemsModel";
import type { cr2b6_operations } from "./generated/models/cr2b6_operationsModel";
import type { cr2b6_batcheses } from "./generated/models/cr2b6_batchesesModel";

import "./App.css";

const useStyles = makeStyles({
  root: {
    height: "100vh",
    width: "100vw",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding("20px"),
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    overflowY: "auto",
    overflowX: "auto",
    boxSizing: "border-box",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    maxWidth: "600px",
    width: "100%",
    minHeight: "100%",
    ...shorthands.gap("32px"),
    ...shorthands.padding("20px", "0"),
  },
  card: {
    width: "100%",
    ...shorthands.padding("40px"),
    textAlign: "center",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  heroText: {
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightHero900,
    marginBottom: "16px",
    "@media (max-width: 768px)": {
      fontSize: tokens.fontSizeHero700,
    },
  },
  heartIcon: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: "1.2em",
    verticalAlign: "middle",
    ...shorthands.margin("0", "8px"),
  },
  subtitle: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase400,
    marginBottom: "24px",
    "@media (max-width: 768px)": {
      fontSize: tokens.fontSizeBase300,
    },
  },
  badgeContainer: {
    display: "flex",
    justifyContent: "center",
    ...shorthands.gap("12px"),
    marginBottom: "32px",
    flexWrap: "wrap",
  },
  buttonContainer: {
    display: "flex",
    ...shorthands.gap("16px"),
    flexWrap: "wrap",
    justifyContent: "center",
  },
  button: {
    minWidth: "120px",
  },
  footer: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
});

const App: React.FC = () => {
  const styles = useStyles();
  const ready = usePowerReady();

  const [systems, setSystems] = useState<cr2b6_systems[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(false);
  const [systemsError, setSystemsError] = useState<string | null>(null);

  const [operations, setOperations] = useState<cr2b6_operations[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState<string | null>(null);

  const [batches, setBatches] = useState<cr2b6_batcheses[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      console.debug("Power SDK not ready yet, skipping fetch for all lists");
      return;
    }

    const fetchAll = async () => {
      console.debug(
        "Fetching systems, operations, and batches from Dataverse..."
      );

      // Systems
      setSystemsLoading(true);
      setSystemsError(null);
      cr2b6_systemsService
        .getAll()
        .then((res) => {
          console.debug("Systems fetch raw result:", res);
          const list = (res.value || res.data || []) as cr2b6_systems[];
          console.debug(`Parsed systems (count=${list.length})`, list);
          setSystems(list);
        })
        .catch((err) => {
          console.error("Systems fetch error:", err);
          setSystemsError(err?.message || "Failed to load systems");
        })
        .finally(() => setSystemsLoading(false));

      // Operations
      setOperationsLoading(true);
      setOperationsError(null);
      cr2b6_operationsService
        .getAll()
        .then((res) => {
          console.debug("Operations fetch raw result:", res);
          const list = (res.value || res.data || []) as cr2b6_operations[];
          console.debug(`Parsed operations (count=${list.length})`, list);
          setOperations(list);
        })
        .catch((err) => {
          console.error("Operations fetch error:", err);
          setOperationsError(err?.message || "Failed to load operations");
        })
        .finally(() => setOperationsLoading(false));

      // Batches
      setBatchesLoading(true);
      setBatchesError(null);
      cr2b6_batchesesService
        .getAll()
        .then((res) => {
          console.debug("Batches fetch raw result:", res);
          const list = (res.value || res.data || []) as cr2b6_batcheses[];
          console.debug(`Parsed batches (count=${list.length})`, list);
          setBatches(list);
        })
        .catch((err) => {
          console.error("Batches fetch error:", err);
          setBatchesError(err?.message || "Failed to load batches");
        })
        .finally(() => setBatchesLoading(false));
    };

    fetchAll();
  }, [ready]);

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.root}>
        <div className={styles.container}>
          <Card className={styles.card}>
            <Text className={styles.heroText}>
              Power Platform
              <HeartRegular className={styles.heartIcon} />
              Code
            </Text>
            <Text className={styles.subtitle}>
              Build modern business applications with the power of code and the
              simplicity of Power Platform—a secure, scalable, and fully managed
              platform designed to accelerate innovation.
            </Text>
            <div className={styles.badgeContainer}>
              <Badge appearance="filled" color="brand">
                Power Apps Code Apps
              </Badge>
              <Badge appearance="outline" color="success">
                Fluent UI v9
              </Badge>
              <Badge appearance="outline" color="important">
                React + TypeScript
              </Badge>
            </div>

            <div className={styles.buttonContainer}>
              <Button
                appearance="primary"
                icon={<CodeRegular />}
                className={styles.button}
                onClick={() => window.open("https://aka.ms/codeapps", "_blank")}
              >
                Get Started
              </Button>
            </div>
          </Card>

          {/* Systems List */}
          <Card className={styles.card} style={{ textAlign: "left" }}>
            <Text weight="semibold" size={500}>
              Systems
            </Text>
            <div style={{ marginTop: 12 }}>
              {!ready && <Text>Initializing Power SDK…</Text>}
              {ready && systemsLoading && <Text>Loading systems…</Text>}
              {ready && !systemsLoading && systemsError && (
                <Text style={{ color: "red" }}>{systemsError}</Text>
              )}
              {ready &&
                !systemsLoading &&
                !systemsError &&
                systems.length === 0 && <Text>No systems found.</Text>}
              {ready &&
                !systemsLoading &&
                !systemsError &&
                systems.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {systems.map((sys) => (
                      <li key={sys.cr2b6_systemid} style={{ marginBottom: 8 }}>
                        <Text weight="semibold">
                          {sys.cr2b6_tag || "(untagged system)"}
                        </Text>
                        <br />
                        <Text size={300}>{sys.cr2b6_description}</Text>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </Card>

          {/* Operations List */}
          <Card className={styles.card} style={{ textAlign: "left" }}>
            <Text weight="semibold" size={500}>
              Operations
            </Text>
            <div style={{ marginTop: 12 }}>
              {!ready && <Text>Initializing Power SDK…</Text>}
              {ready && operationsLoading && <Text>Loading operations…</Text>}
              {ready && !operationsLoading && operationsError && (
                <Text style={{ color: "red" }}>{operationsError}</Text>
              )}
              {ready &&
                !operationsLoading &&
                !operationsError &&
                operations.length === 0 && <Text>No operations found.</Text>}
              {ready &&
                !operationsLoading &&
                !operationsError &&
                operations.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {operations.map((op) => (
                      <li
                        key={op.cr2b6_operationid}
                        style={{ marginBottom: 8 }}
                      >
                        <Text weight="semibold">
                          {op.cr2b6_batchname ||
                            op.cr2b6_typename ||
                            "(operation)"}
                        </Text>
                        <br />
                        <Text size={300}>
                          {op.cr2b6_systemname
                            ? `System: ${op.cr2b6_systemname} · `
                            : ""}
                          {op.cr2b6_starttime
                            ? `Start: ${new Date(
                                op.cr2b6_starttime
                              ).toLocaleString()}`
                            : ""}
                          {op.cr2b6_endtime
                            ? ` → End: ${new Date(
                                op.cr2b6_endtime
                              ).toLocaleString()}`
                            : ""}
                        </Text>
                        {op.cr2b6_description && (
                          <>
                            <br />
                            <Text size={300}>{op.cr2b6_description}</Text>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </Card>

          {/* Batches List */}
          <Card className={styles.card} style={{ textAlign: "left" }}>
            <Text weight="semibold" size={500}>
              Batches
            </Text>
            <div style={{ marginTop: 12 }}>
              {!ready && <Text>Initializing Power SDK…</Text>}
              {ready && batchesLoading && <Text>Loading batches…</Text>}
              {ready && !batchesLoading && batchesError && (
                <Text style={{ color: "red" }}>{batchesError}</Text>
              )}
              {ready &&
                !batchesLoading &&
                !batchesError &&
                batches.length === 0 && <Text>No batches found.</Text>}
              {ready &&
                !batchesLoading &&
                !batchesError &&
                batches.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {batches.map((b) => (
                      <li key={b.cr2b6_batchesid} style={{ marginBottom: 8 }}>
                        <Text weight="semibold">
                          Batch {b.cr2b6_batchnumber}
                        </Text>
                        <br />
                        <Text size={300}>
                          {b.cr2b6_productsname
                            ? `Product: ${b.cr2b6_productsname}`
                            : ""}
                          {b.cr2b6_completedon
                            ? ` · Completed: ${new Date(
                                b.cr2b6_completedon
                              ).toLocaleString()}`
                            : ""}
                        </Text>
                        {b.cr2b6_notes && (
                          <>
                            <br />
                            <Text size={300}>{b.cr2b6_notes}</Text>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </Card>

          <Text className={styles.footer}>
            Ready to build amazing applications? Start coding with Power
            Platform today!
          </Text>
        </div>
      </div>
    </FluentProvider>
  );
};

export default App;
