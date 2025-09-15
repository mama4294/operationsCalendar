import {
  Button,
  Toolbar,
  ToolbarDivider,
  Dropdown,
  Option,
  makeStyles,
  tokens,
  Input,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Toaster,
  useToastController,
  useId,
  Toast,
  ToastTitle,
} from "@fluentui/react-components";
import {
  CalendarLtr24Regular,
  Add24Regular,
  Grid24Regular,
  MoreHorizontal24Regular,
  ZoomIn24Regular,
  ZoomOut24Regular,
  Search24Regular,
  ArrowCounterclockwise24Regular,
  ArrowClockwise24Regular,
} from "@fluentui/react-icons";
import { ZoomLevel } from "../hooks/useViewport";

interface Props {
  zoom: ZoomLevel;
  setZoom: (z: ZoomLevel) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  onJumpToNow: () => void;
  onAddEquipment: () => void;
  onAddOperation: () => void;
  onManageBatches: () => void;
  onExportDb?: () => void | Promise<void>;
  onImportDb?: (file: File) => void | Promise<void>;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
  canUndo?: boolean;
  canRedo?: boolean;
}

const useStyles = makeStyles({
  toolbar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    display: "flex",
    gap: tokens.spacingHorizontalS,
    alignItems: "center",
    flexWrap: "wrap",
    // allow content to compress on small screens
    maxWidth: "100%",
  },
  spacer: { flex: 1 },
  search: {
    minWidth: "140px",
    marginRight: tokens.spacingHorizontalS,
  },
  select: {
    minWidth: "110px",
  },
});

export default function TimelineControls({
  zoom,
  setZoom,
  editMode,
  setEditMode,
  searchTerm,
  setSearchTerm,
  onJumpToNow,
  onAddEquipment,
  onAddOperation,
  onManageBatches,
  onExportDb,
  onImportDb,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: Props) {
  const styles = useStyles();
  const toasterId = useId("controls-toaster");
  const { dispatchToast } = useToastController(toasterId);

  const zoomOptions = [
    { key: "hour", text: "Hour View" },
    { key: "day", text: "Day View" },
    { key: "week", text: "Week View" },
    { key: "month", text: "Month View" },
    { key: "quarter", text: "Quarter View" },
    { key: "year", text: "Year View" },
  ];

  const modeOptions = [
    { key: "view", text: "View Mode" },
    { key: "edit", text: "Edit Mode" },
  ];

  // Insert quarter between month and year
  const zoomOrder: ZoomLevel[] = [
    "hour",
    "day",
    "week",
    "month",
    "quarter",
    "year",
  ];
  const currentZoomIndex = zoomOrder.findIndex((z) => z === zoom);
  const canZoomIn = currentZoomIndex > 0;
  const canZoomOut = currentZoomIndex < zoomOrder.length - 1;

  const handleZoomIn = () => {
    if (!canZoomIn) return;
    setZoom(zoomOrder[currentZoomIndex - 1]);
  };

  const handleZoomOut = () => {
    if (!canZoomOut) return;
    setZoom(zoomOrder[currentZoomIndex + 1]);
  };

  return (
    <Toolbar className={styles.toolbar} size="small">
      {/* Search */}
      <Input
        className={styles.search}
        placeholder=""
        aria-label="Search"
        value={searchTerm}
        contentBefore={<Search24Regular style={{ width: 16, height: 16 }} />}
        onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
      />

      <ToolbarDivider />

      <Button
        appearance="subtle"
        icon={<CalendarLtr24Regular />}
        onClick={onJumpToNow}
      >
        Now
      </Button>

      {/* Zoom Selector */}
      <Dropdown
        className={styles.select}
        aria-labelledby="zoom-label"
        placeholder="Select zoom level"
        value={zoomOptions.find((option) => option.key === zoom)?.text}
        onOptionSelect={(_, data) => setZoom(data.optionValue as ZoomLevel)}
      >
        {zoomOptions.map((option) => (
          <Option key={option.key} value={option.key}>
            {option.text}
          </Option>
        ))}
      </Dropdown>

      <Button
        appearance="subtle"
        icon={<ZoomIn24Regular />}
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
      />

      <Button
        appearance="subtle"
        icon={<ZoomOut24Regular />}
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
      />

      <ToolbarDivider />

      {/* right side spacer to push File menu to far right */}
      <div className={styles.spacer} />

      {/* File menu at far right */}
      {(onExportDb || onImportDb) && (
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={<MoreHorizontal24Regular />}>
              File
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {onExportDb && (
                <MenuItem
                  onClick={async () => {
                    try {
                      await onExportDb();
                      dispatchToast(
                        <Toast>
                          <ToastTitle>Database exported</ToastTitle>
                        </Toast>,
                        { intent: "success" }
                      );
                    } catch (e) {
                      dispatchToast(
                        <Toast>
                          <ToastTitle>Export failed</ToastTitle>
                        </Toast>,
                        { intent: "error" }
                      );
                    }
                  }}
                >
                  Export DB
                </MenuItem>
              )}
              {onImportDb && (
                <MenuItem
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".db,application/octet-stream";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      try {
                        await onImportDb(file);
                        dispatchToast(
                          <Toast>
                            <ToastTitle>Database imported</ToastTitle>
                          </Toast>,
                          { intent: "success" }
                        );
                      } catch (err) {
                        dispatchToast(
                          <Toast>
                            <ToastTitle>Import failed</ToastTitle>
                          </Toast>,
                          { intent: "error" }
                        );
                      }
                    };
                    input.click();
                  }}
                >
                  Import DB
                </MenuItem>
              )}
            </MenuList>
          </MenuPopover>
        </Menu>
      )}

      {/* Toaster for confirmations */}
      <Toaster toasterId={toasterId} />

      {/* Edit/View Mode Selector */}
      <Dropdown
        className={styles.select}
        aria-labelledby="mode-label"
        placeholder="Select mode"
        value={editMode ? "Edit Mode" : "View Mode"}
        onOptionSelect={(_, data) => setEditMode(data.optionValue === "edit")}
      >
        {modeOptions.map((option) => (
          <Option key={option.key} value={option.key}>
            {option.text}
          </Option>
        ))}
      </Dropdown>

      {editMode && (
        <>
          {/* Undo / Redo */}
          {(onUndo || onRedo) && (
            <>
              <Button
                appearance="subtle"
                icon={<ArrowCounterclockwise24Regular />}
                onClick={() => onUndo && onUndo()}
                disabled={!canUndo}
              >
                Undo
              </Button>
              <Button
                appearance="subtle"
                icon={<ArrowClockwise24Regular />}
                onClick={() => onRedo && onRedo()}
                disabled={!canRedo}
              >
                Redo
              </Button>
              <ToolbarDivider />
            </>
          )}

          <Button
            appearance="subtle"
            icon={<Add24Regular />}
            onClick={onAddEquipment}
          >
            Add Equipment
          </Button>

          <Button
            appearance="subtle"
            icon={<Add24Regular />}
            onClick={onAddOperation}
          >
            Add Operation
          </Button>

          <Button
            appearance="subtle"
            icon={<Grid24Regular />}
            onClick={onManageBatches}
          >
            Manage Batches
          </Button>
        </>
      )}
    </Toolbar>
  );
}
