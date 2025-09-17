import { useEffect, useState, useRef } from "react";

// Constants for virtual scrolling sizing
const GROUP_LINE_HEIGHT = 40; // must match timeline lineHeight
const ITEM_HEIGHT_RATIO = 0.9; // tuned for visual vertical centering

import Timeline, {
  TimelineMarkers,
  TodayMarker,
  TimelineHeaders,
  SidebarHeader,
  DateHeader,
} from "react-calendar-timeline";
import "react-calendar-timeline/style.css";
import "../styles/Timeline.css";
import moment from "moment";
import { useViewport } from "../hooks/useViewport";
import type { ZoomLevel } from "../hooks/useViewport";
import TimelineControls from "./TimelineControls";
import { getBatchColor } from "../services/batchColor";
import { EquipmentDialog } from "./EquipmentDialog";
import { OperationDialog } from "./OperationDialog";
import { ContextMenu } from "./ContextMenu";
import { DuplicateOperationsDialog } from "./DuplicateOperationsDialog";
import { BatchManagement } from "./BatchManagement";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
import type { cr2b6_systems } from "../generated/models/cr2b6_systemsModel";
import type { cr2b6_operations } from "../generated/models/cr2b6_operationsModel";
import { dataProvider } from "../services/DataProvider";
import { usePowerReady } from "./PowerProvider";
// types are available in models if needed

// Helper to alphabetically sort batches by batch number (case-insensitive),
// falling back to the primary key if batch number missing. Stable for equal keys.
const sortBatches = (list: cr2b6_batcheses[]) => {
  return list.slice().sort((a, b) => {
    const aKey = (a.cr2b6_batchnumber || a.cr2b6_batchesid || "").toLowerCase();
    const bKey = (b.cr2b6_batchnumber || b.cr2b6_batchesid || "").toLowerCase();
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });
};

export default function TimelineGrid() {
  const {
    zoom,
    setZoom,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    jumpToNow,
  } = useViewport("month");
  const powerReady = usePowerReady();
  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<
    cr2b6_systems | undefined
  >();

  // Operation dialog state
  const [isOperationDialogOpen, setIsOperationDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<
    cr2b6_operations | undefined
  >();

  // Delete confirmation dialog state
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [operationToDelete, setOperationToDelete] = useState<
    cr2b6_operations | undefined
  >();
  const [operationsToDelete, setOperationsToDelete] = useState<
    cr2b6_operations[]
  >([]);
  const [equipment, setEquipment] = useState<cr2b6_systems[]>([]);
  const [batches, setBatches] = useState<cr2b6_batcheses[]>([]);
  const [operations, setOperations] = useState<cr2b6_operations[]>([]);
  // History stacks for undo/redo of operations
  const undoStackRef = useRef<cr2b6_operations[][]>([]);
  const redoStackRef = useRef<cr2b6_operations[][]>([]);
  const isApplyingHistoryRef = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const operationsRef = useRef<cr2b6_operations[]>([]);
  // Edit mode state: when false, editing actions are disabled
  const [editMode, setEditMode] = useState<boolean>(false);
  // Search term for filtering
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Flag to prevent data refresh during delete operations
  const isDeletingRef = useRef<boolean>(false);

  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set()
  );
  // Ref mirrors selectedItems to avoid stale closures in key handlers
  const selectedItemsRef = useRef<Set<string | number>>(new Set());
  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  // Ref for debouncing drag saves
  const dragSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to normalize operation ID
  const getOperationId = (op: cr2b6_operations): string => {
    const id = op.cr2b6_operationid || (op as any).cr2b6_id;
    if (!id) {
      console.error("Operation has no valid ID:", op);
      console.error("cr2b6_operationid:", op.cr2b6_operationid);
      console.error("cr2b6_id:", (op as any).cr2b6_id);
      return "MISSING_ID";
    }
    return String(id);
  };

  // Helpers for history
  const snapshotOps = (ops: cr2b6_operations[] = operations) =>
    ops.map((o) => ({ ...o }));

  const updateHistoryStateFlags = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const pushHistory = () => {
    if (isApplyingHistoryRef.current) return;
    undoStackRef.current.push(snapshotOps());
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    // clear redo stack on new action
    redoStackRef.current = [];
    updateHistoryStateFlags();
  };

  const rebuildItems = (ops: cr2b6_operations[]) => {
    setItems(ops.map((o) => createTimelineItem(o)));
  };

  const rebuildGroupsFromEquipment = (eq: cr2b6_systems[]) => {
    setGroups(
      eq
        .slice()
        .sort((a, b) => (a.cr2b6_order ?? 0) - (b.cr2b6_order ?? 0))
        .map((g: any) => ({
          id: g.cr2b6_systemid,
          title: g.cr2b6_description,
          rightTitle: g.cr2b6_tag,
        }))
    );
  };

  const persistFromTo = async (
    oldOps: cr2b6_operations[],
    newOps: cr2b6_operations[]
  ) => {
    const oldById = new Map(oldOps.map((o) => [getOperationId(o), o]));
    const newById = new Map(newOps.map((o) => [getOperationId(o), o]));

    // Deletes
    const toDelete = [...oldById.keys()].filter((id) => !newById.has(id));
    // Upserts
    const toUpsert = newOps;

    await Promise.all([
      ...toDelete.map((id) => dataProvider.deleteOperation(id)),
      ...toUpsert.map((op) => dataProvider.saveOperation(op as any)),
    ]);
  };

  const applyOpsFromHistory = async (targetOps: cr2b6_operations[]) => {
    const prev = operations;
    isApplyingHistoryRef.current = true;
    setOperations(snapshotOps(targetOps));
    rebuildItems(targetOps);
    isApplyingHistoryRef.current = false;
    try {
      await persistFromTo(prev, targetOps);
    } catch (e) {
      console.error("Failed to sync operations during undo/redo", e);
    }
  };

  // Keep a ref of current operations for keyboard handlers
  useEffect(() => {
    operationsRef.current = snapshotOps(operations);
  }, [operations]);

  // Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z (redo)
  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable = target?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) return;

      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (!ctrlOrMeta) return;

      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        // Undo
        e.preventDefault();
        if (undoStackRef.current.length === 0) return;
        const prevState = undoStackRef.current.pop()!;
        redoStackRef.current.push(snapshotOps(operationsRef.current));
        await applyOpsFromHistory(prevState);
        updateHistoryStateFlags();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        // Redo
        e.preventDefault();
        if (redoStackRef.current.length === 0) return;
        const nextState = redoStackRef.current.pop()!;
        undoStackRef.current.push(snapshotOps(operationsRef.current));
        await applyOpsFromHistory(nextState);
        updateHistoryStateFlags();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    operationId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    operationId: null,
  });

  // Duplicate dialog state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [operationsToDuplicate, setOperationsToDuplicate] = useState<string[]>(
    []
  );

  // Batch management state
  const [isBatchManagementOpen, setIsBatchManagementOpen] = useState(false);

  // Virtual group windowing (Option 3)
  const [groupOffset, setGroupOffset] = useState(0); // starting index in groups array
  const [groupsPerPage, setGroupsPerPage] = useState(30); // dynamic later
  const scrollAccumRef = useRef(0);
  const dragRef = useRef<{
    startY: number;
    startOffset: number;
    dragging: boolean;
  }>({ startY: 0, startOffset: 0, dragging: false });
  const timelineOuterRef = useRef<HTMLDivElement | null>(null);

  // Helper function to create timeline items from operations
  const createTimelineItem = (operation: cr2b6_operations, batchesArray?: cr2b6_batcheses[]) => {
    const operationBatchId =
      (operation as any)._cr2b6_batch_value || operation.cr2b6_batch;
    const batchesToUse = batchesArray || batches;
    const batch = batchesToUse.find(
      (b: cr2b6_batcheses) => b.cr2b6_batchesid === operationBatchId
    );
    // Check if operation is maintenance or engineering - handle both string and numeric types
    let isMaintenance = false;
    let isEngineering = false;
    if (operation.cr2b6_type) {
      const typeStr = String(operation.cr2b6_type).toLowerCase();
      // Check direct string matches first
      isMaintenance = typeStr.includes("maintenance");
      isEngineering = typeStr.includes("engineering");
      
      // Also check numeric type codes
      if (!isMaintenance && !isEngineering) {
        const numericType = Number(operation.cr2b6_type);
        isMaintenance = numericType === 566210001; // Maintenance type code
        isEngineering = numericType === 566210002; // Engineering type code
      }
    }
    
    let bgColor = "#d3d3d3";
    let textColor = "#000";
    if (isMaintenance) {
      bgColor = "#ff9800"; // Orange for maintenance
      textColor = "#fff";
    } else if (isEngineering) {
      bgColor = "#e8d4a2"; // Tan for engineering
      textColor = "#fff";
    } else if (batch) {
      bgColor = getBatchColor(batch);
      textColor = "#fff";
    }

    return {
      id: getOperationId(operation),
      group: (operation as any)._cr2b6_system_value || operation.cr2b6_system,
      title: operation.cr2b6_description,
      description: operation.cr2b6_description,
      type: operation.cr2b6_type,
      batchId: operationBatchId,
      start_time: moment(operation.cr2b6_starttime).valueOf(),
      end_time: moment(operation.cr2b6_endtime).valueOf(),
      itemProps: {
        style: {
          background: bgColor,
          color: textColor,
          border: batch ? "none" : "1px solid #999",
        },
      },
    };
  };

  useEffect(() => {
    console.log("=== DATA LOADING useEffect TRIGGERED ===");
    console.log("powerReady:", powerReady);
    console.log("isDeletingRef.current:", isDeletingRef.current);
    console.log("startDate:", startDate);
    console.log("endDate:", endDate);

    if (!powerReady || isDeletingRef.current) {
      console.log(
        "Skipping data load - powerReady:",
        powerReady,
        "isDeletingRef:",
        isDeletingRef.current
      );
      return;
    }

    console.log("Proceeding with data load...");
    let mounted = true;
    (async () => {
      const [eq, ops, batches] = await Promise.all([
        dataProvider.getEquipment(),
        dataProvider.getOperations(startDate, endDate),
        dataProvider.getBatches(),
      ]);
      console.log("Equipment:", eq);
      console.log("Batches:", batches);
      const batchColorById: Record<string, string> = {};
      batches.forEach((b: cr2b6_batcheses) => {
        // Use the batch GUID as the key since that's what operations reference
        const bid = b.cr2b6_batchesid;
        if (bid) batchColorById[String(bid)] = getBatchColor(b);
      });
      console.log("Batch color mapping:", batchColorById);
      if (!mounted) return;

      // Attach a stable order (persist existing order if present, else index)
      const withOrder: cr2b6_systems[] = (eq as cr2b6_systems[]).map(
        (e, i) => ({ ...e, __order: (e as any).cr2b6_order ?? i })
      );
      withOrder.sort((a, b) => (a.cr2b6_order ?? 0) - (b.cr2b6_order ?? 0));
      setEquipment(withOrder);
      setBatches(sortBatches(batches));
      setOperations(ops as any);

      const orderedForGroups = withOrder
        .slice()
        .sort((a, b) => (a.cr2b6_order ?? 0) - (b.cr2b6_order ?? 0));
      setGroups(
        orderedForGroups.map((g: any) => ({
          id: g.cr2b6_systemid,
          title: g.cr2b6_description,
          rightTitle: g.cr2b6_tag,
        }))
      );

      console.log("Operations:", ops);
      console.log("Operations count:", ops.length);
      console.log("First operation:", ops[0]);
      console.log(
        "Operations system values:",
        ops.map((o) => ({
          id: o.cr2b6_operationid ?? o.cr2b6_id,
          system: (o as any)._cr2b6_system_value || o.cr2b6_system,
        }))
      );
      setItems(
        (ops as unknown as cr2b6_operations[]).map((o) => createTimelineItem(o, batches))
      );
      console.log(
        "Items set:",
        (ops as unknown as cr2b6_operations[]).map((o) => ({
          id: String(o.cr2b6_operationid ?? o.cr2b6_id),
          group: (o as any)._cr2b6_system_value || o.cr2b6_system,
          title: o.cr2b6_description,
        }))
      );
    })();
    return () => {
      mounted = false;
    };
  }, [startDate, endDate, powerReady]);

  // Recalculate groupsPerPage based on container height & lineHeight (40) when size changes
  useEffect(() => {
    const el = timelineOuterRef.current;
    if (!el) return;
    const compute = () => {
      // Use current computed padding from style (we minimized padding earlier)
      const style = getComputedStyle(el);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const total = el.clientHeight - paddingTop - paddingBottom;
      const headerEl = el.querySelector(
        ".rct-header-root"
      ) as HTMLElement | null;
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 48;
      // Available vertical space for rows
      const usable = Math.max(0, total - headerH);
      // Allow an extra row if there's > 70% of a row free
      const raw = usable / GROUP_LINE_HEIGHT;
      let per = Math.max(3, Math.floor(raw + (raw % 1 > 0.7 ? 1 : 0)));
      console.log(
        "groupsPerPage calculation - el.clientHeight:",
        el.clientHeight,
        "total:",
        total,
        "headerH:",
        headerH,
        "usable:",
        usable,
        "raw:",
        raw,
        "per:",
        per
      );
      setGroupsPerPage(per);
    };
    const resizeObserver = new ResizeObserver(() => compute());
    resizeObserver.observe(el);
    // Run after initial paint (header may not exist yet)
    setTimeout(compute, 0);
    return () => resizeObserver.disconnect();
  }, []);

  // Clamp offset when groups change
  useEffect(() => {
    setGroupOffset((prev) => {
      const maxStart = Math.max(0, groups.length - groupsPerPage);
      return Math.min(prev, maxStart);
    });
  }, [groups, groupsPerPage]);

  const visibleTimeStart = moment(startDate).valueOf();
  const visibleTimeEnd = moment(endDate).valueOf();

  // Filter items by search term (batchId, equipment title/tag, or operation type)
  let displayedItems = items.filter((it) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const batchMatch =
      it.batchId && String(it.batchId).toLowerCase().includes(s);
    
    // Handle operation type search - map numeric values to readable names
    let typeMatch = false;
    if (it.type) {
      const typeStr = String(it.type).toLowerCase();
      // Check direct string match first
      typeMatch = typeStr.includes(s);
      
      // Also check human-readable type names
      if (!typeMatch) {
        const typeMap: Record<number, string> = {
          566210000: "production",
          566210001: "maintenance", 
          566210002: "engineering",
          566210003: "miscellaneous",
        };
        const numericType = Number(it.type);
        const readableName = typeMap[numericType];
        if (readableName) {
          typeMatch = readableName.toLowerCase().includes(s);
        }
      }
    }
    
    const titleMatch = it.title && String(it.title).toLowerCase().includes(s);
    const descMatch =
      it.description && String(it.description).toLowerCase().includes(s);
    // find equipment by the Dataverse-generated id field
    const eq = equipment.find(
      (e) => String(e.cr2b6_systemid) === String(it.group)
    );
    const equipmentMatch =
      eq &&
      (String(eq.cr2b6_description || "")
        .toLowerCase()
        .includes(s) ||
        String(eq.cr2b6_tag || "")
          .toLowerCase()
          .includes(s));
          
    // Also search in batch number if available
    let batchNumberMatch = false;
    if (it.batchId) {
      const batch = batches.find(b => b.cr2b6_batchesid === it.batchId);
      if (batch && batch.cr2b6_batchnumber) {
        batchNumberMatch = String(batch.cr2b6_batchnumber).toLowerCase().includes(s);
      }
    }
          
    return Boolean(
      batchMatch || typeMatch || equipmentMatch || titleMatch || descMatch || batchNumberMatch
    );
  });
  console.log("Items after search filter:", displayedItems);

  // Filter groups (view mode lazily filters empty groups in time window)
  // In edit mode, always show all equipment
  // In view mode, only show equipment that has operations in the current time window
  const filteredGroups = editMode
    ? groups
    : groups.filter((group) => {
        // Check if this group has any operations in the visible time window
        // Use the search-filtered items to respect search criteria
        const hasOperationsInWindow = displayedItems.some(
          (item) =>
            String(item.group) === String(group.id) &&
            item.start_time < visibleTimeEnd &&
            item.end_time > visibleTimeStart
        );
        return hasOperationsInWindow;
      });

  // Apply virtual window
  const maxStart = Math.max(0, filteredGroups.length - groupsPerPage);
  const clampedOffset = Math.min(groupOffset, maxStart);
  let displayedGroups = filteredGroups.slice(
    clampedOffset,
    clampedOffset + groupsPerPage
  );

  // Further constrain displayed items to those in visible group window
  const visibleGroupIds = new Set(displayedGroups.map((g) => String(g.id)));
  displayedItems = displayedItems.filter((it) =>
    visibleGroupIds.has(String(it.group))
  );
  console.log("Items after visible group filter:", displayedItems);
  console.log("Visible group IDs:", Array.from(visibleGroupIds));

  // Inject placeholder if no items to display
  // if (displayedItems.length === 0) {
  //   displayedGroups = [
  //     {
  //       id: "placeholder",
  //       title: "No operations",
  //       rightTitle: "",
  //     },
  //   ];
  //   displayedItems = [
  //     {
  //       id: "placeholder-item",
  //       group: "placeholder",
  //       title: "No operations scheduled",
  //       start_time: visibleTimeStart,
  //       end_time: visibleTimeEnd,
  //       itemProps: {
  //         style: {
  //           background: "#f3f2f1",
  //           color: "#888",
  //           fontStyle: "italic",
  //           border: "none",
  //           pointerEvents: "none",
  //         },
  //       },
  //     },
  //   ];
  // }

  const handleTimeChange = (
    visibleTimeStart: number,
    visibleTimeEnd: number
  ) => {
    setStartDate(new Date(visibleTimeStart));
    setEndDate(new Date(visibleTimeEnd));
  };

  const handleItemMove = async (
    itemId: string | number,
    dragTime: number,
    _newGroupOrder: number
  ) => {
    if (!editMode) return; // Prevent moves when not in edit mode
    const item = items.find((item) => item.id === itemId);
    if (!item) return;

    // Determine which items to move - if the dragged item is selected, move all selected items
    const itemsToMove = selectedItems.has(itemId)
      ? Array.from(selectedItems)
      : [itemId];

    const difference = dragTime - item.start_time;

    // Update local state immediately for smooth UI - this provides real-time visual feedback
    const newItems = items.map((currentItem) => {
      if (itemsToMove.includes(currentItem.id)) {
        return {
          ...currentItem,
          start_time: currentItem.start_time + difference,
          end_time: currentItem.end_time + difference,
          // Keep original equipment group - no equipment changes allowed
          group: currentItem.group,
        };
      }
      return currentItem;
    });

    // Set items immediately to show all selected items moving in real-time
    setItems(newItems);

    // Debounced save - only save after user stops dragging for a brief moment
    if (dragSaveTimeoutRef.current) {
      clearTimeout(dragSaveTimeoutRef.current);
    }
    dragSaveTimeoutRef.current = setTimeout(async () => {
      // record history once per move commit
      pushHistory();
      // Update operations state and save to backend
      const updatePromises = [];

      for (const moveItemId of itemsToMove) {
        const originalItem = items.find((i) => i.id === moveItemId);
        if (!originalItem) continue;

        const newStartTime = new Date(originalItem.start_time + difference);
        const newEndTime = new Date(originalItem.end_time + difference);

        // Update operations state
        setOperations((prev) =>
          prev.map((op) => {
            if (getOperationId(op) === moveItemId) {
              return {
                ...op,
                cr2b6_starttime: newStartTime,
                cr2b6_endtime: newEndTime,
                // Keep original equipment - no equipment changes allowed
                cr2b6_system: op.cr2b6_system,
                modifiedon: new Date(),
              };
            }
            return op;
          })
        );

        // Queue save operation
        const operationToUpdate = operations.find(
          (op) => getOperationId(op) === moveItemId
        );
        if (operationToUpdate) {
          updatePromises.push(
            dataProvider.saveOperation({
              ...operationToUpdate,
              cr2b6_starttime: newStartTime,
              cr2b6_endtime: newEndTime,
              // Keep original equipment
              cr2b6_system: operationToUpdate.cr2b6_system,
              modifiedon: new Date(),
            } as any)
          );
        }
      }

      // Save all updates to backend
      try {
        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Failed to save operation moves:", error);
        // TODO: Show error message to user and potentially revert changes
      }
    }, 300); // Wait 300ms after user stops dragging before saving
  };

  const handleItemResize = async (
    itemId: string | number,
    time: number,
    edge: string
  ) => {
    if (!editMode) return; // Prevent resizing when not in edit mode
    const item = items.find((item) => item.id === itemId);
    if (!item) return;

    const newStartTime =
      edge === "left" ? new Date(time) : new Date(item.start_time);
    const newEndTime =
      edge === "left" ? new Date(item.end_time) : new Date(time);

    // Update local state immediately for smooth UI
    const newItems = items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          start_time: edge === "left" ? time : item.start_time,
          end_time: edge === "left" ? item.end_time : time,
        };
      }
      return item;
    });
    setItems(newItems);

    // Update operations state
    pushHistory();
    setOperations((prev) =>
      prev.map((op) => {
        if (getOperationId(op) === itemId) {
          return {
            ...op,
            cr2b6_starttime: newStartTime,
            cr2b6_endtime: newEndTime,
            modifiedon: new Date(),
          };
        }
        return op;
      })
    );

    // Save to backend
    try {
      const operationToUpdate = operations.find(
        (op) => getOperationId(op) === itemId
      );
      if (operationToUpdate) {
        await dataProvider.saveOperation({
          ...operationToUpdate,
          cr2b6_starttime: newStartTime,
          cr2b6_endtime: newEndTime,
        } as any);
      }
    } catch (error) {
      console.error("Failed to save operation resize:", error);
      // TODO: Show error message to user and potentially revert changes
    }
  };

  const handleItemSelect = (itemId: string | number, e?: any) => {
    // Handle multi-select with CMD/Ctrl key
    if (e && (e.metaKey || e.ctrlKey)) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else {
      // Single select - clear others and select this one
      setSelectedItems(new Set([itemId]));
    }
  };

  // Global Delete key handler (avoids per-selection listener & stale state)
  useEffect(() => {
    const handleKey = async (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!editMode) return;
      // Don't delete if focused element is an input-like field (editing text)
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        const isEditable = active.isContentEditable;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          isEditable ||
          active.getAttribute("role") === "textbox"
        ) {
          return; // allow normal text deletion
        }
      }
      const ids = Array.from(selectedItemsRef.current);
      if (ids.length === 0) return;

      console.log("Delete key pressed with selected items:", ids);
      console.log(
        "Current operations state:",
        operations.map((op) => ({
          id: getOperationId(op),
          description: op.cr2b6_description,
        }))
      );

      // Find operations to delete
      const opsToDelete = ids
        .map((id) => {
          const op = operations.find((o) => getOperationId(o) === String(id));
          console.log(
            `Mapping ID ${id} to operation:`,
            op ? getOperationId(op) : "NOT_FOUND"
          );
          return op;
        })
        .filter((op) => op !== undefined) as cr2b6_operations[];

      console.log(
        `Found ${opsToDelete.length} operations to delete:`,
        opsToDelete.map((op) => getOperationId(op))
      );

      if (opsToDelete.length > 0) {
        console.log("Setting operationsToDelete and opening dialog");
        setOperationsToDelete(opsToDelete);
        setIsDeleteConfirmationOpen(true);
      } else {
        console.log("No valid operations found for deletion");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editMode, operations]);

  const handleEditEquipment = async (groupId: string) => {
    if (!editMode) return; // Editing equipment not allowed in view mode
    console.log("Group ID clicked:", groupId);
    const allEquipment = await dataProvider.getEquipment();
    console.log("All equipment:", allEquipment);
    const equipment = allEquipment.find(
      (eq: any) => eq.cr2b6_systemid === groupId
    );
    console.log("Found equipment:", equipment);
    if (equipment) {
      setSelectedEquipment(equipment as cr2b6_systems);
      setIsDialogOpen(true);
    }
  };

  const handleNewEquipment = () => {
    if (!editMode) return;
    setSelectedEquipment(undefined);
    setIsDialogOpen(true);
  };

  const refreshEquipment = async () => {
    const eq = await dataProvider.getEquipment();
    const ordered = (eq as any[])
      .slice()
      .sort((a, b) => (a.cr2b6_order ?? 0) - (b.cr2b6_order ?? 0));
    setEquipment(
      ordered.map((e, i) => ({ ...e, __order: e.cr2b6_order ?? i }))
    );
    setGroups(
      ordered.map((g: any) => ({
        id: g.cr2b6_systemid,
        title: g.cr2b6_description,
        rightTitle: g.cr2b6_tag,
      }))
    );
  };

  const handleSaveEquipment = async (equipment: Partial<cr2b6_systems>) => {
    try {
      await dataProvider.saveEquipment(equipment);
      await refreshEquipment();
      // Clear any selected equipment so next Add starts fresh
      setSelectedEquipment(undefined);
    } catch (error) {
      console.error("Failed to save equipment:", error);
      // TODO: Show error message to user
    }
  };

  // Equipment deletion disabled — only create and edit allowed

  // Operation handlers
  const handleNewOperation = () => {
    if (!editMode) return;
    setSelectedOperation(undefined);
    setIsOperationDialogOpen(true);
  };

  const handleEditOperation = (operationId: string) => {
    // Allow opening in view mode for read-only

    // Find the operation in the operations state first, then items if needed
    let operation = operations.find((op) => getOperationId(op) === operationId);

    if (!operation) {
      // Fall back to converting from timeline item
      const item = items.find((item) => item.id === operationId);
      if (item) {
        operation = {
          cr2b6_operationid: item.id,
          cr2b6_system: item.group,
          cr2b6_batch: item.batchId || null,
          cr2b6_starttime: new Date(item.start_time),
          cr2b6_endtime: new Date(item.end_time),
          cr2b6_type: item.type || "Production",
          cr2b6_description: item.title,
          createdon: new Date(),
          modifiedon: new Date(),
        } as cr2b6_operations;
      }
    }

    if (operation) {
      setSelectedOperation(operation);
      setIsOperationDialogOpen(true);
    }
  };

  const handleSaveOperation = async (operation: Partial<cr2b6_operations>) => {
    try {
      // snapshot before change
      pushHistory();
      const saved = (await dataProvider.saveOperation(
        operation as any
      )) as unknown as cr2b6_operations;

      // Update operations state
      if (operation.cr2b6_operationid || operation.cr2b6_id) {
        setOperations((prev) =>
          prev.map((op) =>
            getOperationId(op) === getOperationId(operation as cr2b6_operations)
              ? saved
              : op
          )
        );

        // Update timeline items
        const timelineItem = createTimelineItem(saved);
        setItems((prev) =>
          prev.map((item) =>
            item.id === getOperationId(operation as cr2b6_operations)
              ? timelineItem
              : item
          )
        );
      } else {
        setOperations((prev) => [...prev, saved]);

        // Add new timeline item
        const timelineItem = createTimelineItem(saved);
        setItems((prev) => [...prev, timelineItem]);
      }

      setIsOperationDialogOpen(false);
      setSelectedOperation(undefined);
    } catch (error) {
      console.error("Failed to save operation:", error);
      // TODO: Show error message to user
    }
  };

  const handleDeleteOperation = () => {
    console.log(
      "handleDeleteOperation called with selectedOperation:",
      selectedOperation
    );
    if (selectedOperation) {
      console.log(
        "Setting operationToDelete:",
        getOperationId(selectedOperation)
      );
      setOperationToDelete(selectedOperation);
      setIsDeleteConfirmationOpen(true);
    } else {
      console.log("No selectedOperation found");
    }
  };

  const confirmDeleteOperation = async () => {
    const operationsToProcess =
      operationsToDelete.length > 0
        ? operationsToDelete
        : operationToDelete
        ? [operationToDelete]
        : [];

    console.log("confirmDeleteOperation called with:", {
      operationsToDelete: operationsToDelete.length,
      operationToDelete: operationToDelete
        ? getOperationId(operationToDelete)
        : null,
      operationsToProcess: operationsToProcess.length,
    });

    if (operationsToProcess.length > 0) {
      try {
        // Prevent data refresh during delete operation
        isDeletingRef.current = true;
        pushHistory();

        // Collect all operation IDs to delete and validate them
        console.log("Operations to process:", operationsToProcess);
        operationsToProcess.forEach((op, index) => {
          console.log(`Operation ${index}:`, {
            cr2b6_operationid: op.cr2b6_operationid,
            cr2b6_id: (op as any).cr2b6_id,
            description: op.cr2b6_description,
            fullObject: op,
          });
        });

        const idsToDelete = operationsToProcess
          .map((op) => getOperationId(op))
          .filter((id) => id !== "MISSING_ID"); // Filter out invalid IDs

        if (idsToDelete.length === 0) {
          console.error("No valid operation IDs found to delete!");
          return;
        }

        if (idsToDelete.length !== operationsToProcess.length) {
          console.warn(
            `Only ${idsToDelete.length} out of ${operationsToProcess.length} operations have valid IDs`
          );
        }

        console.log(
          `Attempting to delete ${idsToDelete.length} operations:`,
          idsToDelete
        );
        console.log(
          "Operations before delete:",
          operations.map((op) => getOperationId(op))
        );
        console.log(
          "Items before delete:",
          items.map((i) => String(i.id))
        );

        // Delete all operations from the backend
        console.log(
          "About to call dataProvider.deleteOperation for each operation..."
        );
        const deletePromises = operationsToProcess
          .filter((op) => getOperationId(op) !== "MISSING_ID") // Only process operations with valid IDs
          .map(async (op) => {
            const opId = getOperationId(op);
            console.log(`Starting delete for operation ${opId}`);
            try {
              const result = await dataProvider.deleteOperation(opId);
              console.log(`Delete result for operation ${opId}:`, result);
              return { opId, success: true, result };
            } catch (error) {
              console.error(`Delete failed for operation ${opId}:`, error);
              return { opId, success: false, error };
            }
          });

        const deleteResults = await Promise.all(deletePromises);
        console.log("All delete operations completed. Results:", deleteResults);

        // Check if any deletes failed
        const failedDeletes = deleteResults.filter((r) => !r.success);
        if (failedDeletes.length > 0) {
          console.error(
            `${failedDeletes.length} deletes failed:`,
            failedDeletes
          );
        } else {
          console.log("All backend deletes succeeded");
        }

        // Update state in batch - remove all deleted operations at once
        console.log("Updating operations state...");
        console.log(
          "Operations before state update:",
          operations.map((op) => ({
            id: getOperationId(op),
            desc: op.cr2b6_description,
          }))
        );

        setOperations((prev) => {
          const newOps = prev.filter(
            (p) => !idsToDelete.includes(getOperationId(p))
          );
          console.log(
            `Operations state update: ${prev.length} -> ${newOps.length}`
          );
          console.log(
            "Remaining operations:",
            newOps.map((op) => ({
              id: getOperationId(op),
              desc: op.cr2b6_description,
            }))
          );
          return newOps;
        });

        console.log("Updating items state...");
        console.log(
          "Items before state update:",
          items.map((i) => ({
            id: String(i.id),
            title: i.title,
          }))
        );

        setItems((prev) => {
          const newItems = prev.filter(
            (i) => !idsToDelete.includes(String(i.id))
          );
          console.log(
            `Items state update: ${prev.length} -> ${newItems.length}`
          );
          console.log(
            "Remaining items:",
            newItems.map((i) => ({
              id: String(i.id),
              title: i.title,
            }))
          );
          return newItems;
        });

        // Clear selections and close dialogs
        setSelectedItems(new Set());
        setIsOperationDialogOpen(false);
        setSelectedOperation(undefined);
        setOperationToDelete(undefined);
        setOperationsToDelete([]);

        console.log(`Successfully deleted ${idsToDelete.length} operations`);

        // Add a delayed check to see if something is overriding our state
        setTimeout(() => {
          console.log("=== POST-DELETE STATE CHECK (after 1 second) ===");
          console.log("isDeletingRef.current:", isDeletingRef.current);
          console.log("Current operations count:", operations.length);
          console.log("Current items count:", items.length);
          console.log(
            "Operations still present:",
            operations.map((op) => ({
              id: getOperationId(op),
              desc: op.cr2b6_description,
            }))
          );
          console.log(
            "Items still present:",
            items.map((i) => ({
              id: String(i.id),
              title: i.title,
            }))
          );

          // Check if any of the "deleted" operations are still there
          const stillPresentOps = operations.filter((op) =>
            idsToDelete.includes(getOperationId(op))
          );
          const stillPresentItems = items.filter((i) =>
            idsToDelete.includes(String(i.id))
          );

          if (stillPresentOps.length > 0) {
            console.error(
              "❌ OPERATIONS STILL PRESENT AFTER DELETE:",
              stillPresentOps.map((op) => getOperationId(op))
            );
          } else {
            console.log("✅ No deleted operations found in operations state");
          }

          if (stillPresentItems.length > 0) {
            console.error(
              "❌ ITEMS STILL PRESENT AFTER DELETE:",
              stillPresentItems.map((i) => String(i.id))
            );
          } else {
            console.log("✅ No deleted operations found in items state");
          }
        }, 1000);
      } catch (error) {
        console.error("Failed to delete operation:", error);
        // TODO: Show error message to user
      } finally {
        // Re-enable data refresh after delete operation completes
        isDeletingRef.current = false;
      }
    } else {
      console.log("No operations to delete");
    }
  };

  // Batch handlers
  const handleManageBatches = () => {
    setIsBatchManagementOpen(true);
  };

  const handleSaveBatch = async (batchData: Partial<cr2b6_batcheses>) => {
    try {
      const savedBatch = await dataProvider.saveBatch(batchData);

      // Update batches state using cr2b6_batchnumber as canonical key
      const savedKey =
        savedBatch.cr2b6_batchnumber || savedBatch.cr2b6_batchesid;
      if (
        batches.find(
          (b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === savedKey
        )
      ) {
        // Update existing batch
        setBatches((prev) =>
          sortBatches(
            prev.map((batch) =>
              (batch.cr2b6_batchnumber || batch.cr2b6_batchesid) === savedKey
                ? savedBatch
                : batch
            )
          )
        );
      } else {
        // Add new batch (keep list sorted)
        setBatches((prev) => sortBatches([...prev, savedBatch]));
      }

      console.log("Batch saved successfully:", savedBatch);
    } catch (error) {
      console.error("Failed to save batch:", error);
      // TODO: Show error message to user
      alert(
        `Error: ${
          error instanceof Error ? error.message : "Failed to save batch"
        }`
      );
    }
  };

  // Batch deletion disabled — not supported from UI

  // Context menu handlers
  const handleContextMenuEdit = () => {
    if (!editMode) return;
    if (contextMenu.operationId) {
      handleEditOperation(contextMenu.operationId);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContextMenuDelete = () => {
    if (!editMode) return;
    if (contextMenu.operationId) {
      // Find the operation from the operations state first
      const operation = operations.find(
        (op) => getOperationId(op) === contextMenu.operationId
      );

      if (operation) {
        // Use the actual operation from state
        setOperationToDelete(operation);
        setIsDeleteConfirmationOpen(true);
      } else {
        // Fallback: try to find from items and convert
        const item = items.find(
          (item) => String(item.id) === contextMenu.operationId
        );
        if (item) {
          console.warn(
            "Creating operation from timeline item - this may cause issues:",
            item
          );
          const operationData: cr2b6_operations = {
            cr2b6_operationid: String(item.id) as any,
            cr2b6_system: item.group,
            cr2b6_batch: item.batchId || null,
            cr2b6_starttime: new Date(item.start_time),
            cr2b6_endtime: new Date(item.end_time),
            cr2b6_type: item.type || "Production",
            cr2b6_description: item.title,
            createdon: new Date(),
            modifiedon: new Date(),
          } as cr2b6_operations;
          setOperationToDelete(operationData);
          setIsDeleteConfirmationOpen(true);
        } else {
          console.error(
            "Could not find operation to delete with ID:",
            contextMenu.operationId
          );
        }
      }

      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContextMenuSelectBatch = () => {
    if (contextMenu.operationId) {
      // Find the operation to get its batchId
      const operation =
        operations.find(
          (op) => getOperationId(op) === contextMenu.operationId
        ) || items.find((item) => item.id === contextMenu.operationId);

      if (operation) {
        let batchId: string | null = null;

        if ("cr2b6_operationid" in operation || "cr2b6_id" in operation) {
          // It's a cr2b6_operations object - use the actual Dataverse field
          batchId =
            (operation as any)._cr2b6_batch_value || operation.cr2b6_batch;
          console.log("Operation object batch lookup:", {
            operationId: contextMenu.operationId,
            _cr2b6_batch_value: (operation as any)._cr2b6_batch_value,
            cr2b6_batch: operation.cr2b6_batch,
            finalBatchId: batchId,
          });
        } else {
          // It's a timeline item
          batchId = operation.batchId || null;
          console.log("Timeline item batch lookup:", {
            operationId: contextMenu.operationId,
            batchId: operation.batchId,
            finalBatchId: batchId,
          });
        }

        if (batchId) {
          // Find all operations with the same batchId
          const operationsInBatch = operations.filter((op) => {
            const opBatchId = (op as any)._cr2b6_batch_value || op.cr2b6_batch;
            return opBatchId === batchId;
          });
          const itemsInBatch = items.filter((item) => item.batchId === batchId);

          // Combine the IDs from both sources
          const batchOperationIds = new Set([
            ...operationsInBatch.map((op) => getOperationId(op)),
            ...itemsInBatch.map((item) => item.id),
          ]);

          // Update selected items to include all operations in the batch
          setSelectedItems(batchOperationIds);

          console.log(
            `Selected batch ${batchId} with ${batchOperationIds.size} operations`
          );
        } else {
          console.log("Operation has no batch ID");
        }
      }

      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContextMenuSelectBatchBelow = () => {
    if (!contextMenu.operationId) return;
    // Locate the reference operation (from operations array or items fallback)
    const operation =
      operations.find((op) => getOperationId(op) === contextMenu.operationId) ||
      items.find((item) => item.id === contextMenu.operationId);
    if (!operation) return;

    // Normalized accessors
    const opBatchId =
      "cr2b6_batch" in operation ? operation.cr2b6_batch : operation.batchId;
    const opEquipmentId =
      "cr2b6_system" in operation ? operation.cr2b6_system : operation.group;
    if (!opBatchId) {
      console.log("Operation has no batch to extend selection below.");
      setContextMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Determine ordering of equipment groups; groups array holds list in order displayed (after potential reorder)
    const equipmentOrder: string[] = groups.map((g) => String(g.id));
    const startIdx = equipmentOrder.indexOf(String(opEquipmentId));
    if (startIdx === -1) {
      setContextMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Collect all equipment ids below current
    const equipmentBelow = new Set(equipmentOrder.slice(startIdx)); // include current row

    // Collect operations (source of truth operations state) that match batch and are in rows below
    const matchingOps = operations.filter((op) => {
      const opBatch = (op as any)._cr2b6_batch_value || op.cr2b6_batch;
      const opSystem = (op as any)._cr2b6_system_value || op.cr2b6_system;
      return opBatch === opBatchId && equipmentBelow.has(String(opSystem));
    });
    // Also account for any items not yet synced in operations state
    const matchingItems = items.filter(
      (it) => it.batchId === opBatchId && equipmentBelow.has(String(it.group))
    );

    const newSelection = new Set<string | number>([
      ...matchingOps.map((m) => getOperationId(m)),
      ...matchingItems.map((m) => m.id),
    ]);

    // Ensure current clicked operation is included
    newSelection.add(contextMenu.operationId);
    setSelectedItems(newSelection);
    console.log(
      `Selected batch ${opBatchId} across ${newSelection.size} operations in rows below.`
    );
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextMenuDuplicate = () => {
    if (!editMode) return;
    if (contextMenu.operationId) {
      // Get the currently selected operations (if any) or just the clicked operation
      const operationIds =
        selectedItems.size > 0
          ? Array.from(selectedItems).map(String)
          : [contextMenu.operationId];

      setOperationsToDuplicate(operationIds);
      setIsDuplicateDialogOpen(true);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleDuplicateOperations = async (batchId: string | null) => {
    try {
      // snapshot before duplicating
      pushHistory();
      const duplicatedOperations: cr2b6_operations[] = [];

      // Convert batch number to batch GUID if needed
      let actualBatchGuid: string | null = null;
      if (batchId) {
        // Check if batchId is already a GUID (contains hyphens) or a batch number
        if (batchId.includes("-") && !batchId.match(/^[0-9a-f-]{36}$/i)) {
          // It's a batch number like "25-MIA-01", find the corresponding GUID
          const batch = batches.find(
            (b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === batchId
          );
          actualBatchGuid = batch?.cr2b6_batchesid || null;
          console.log(
            `Converting batch number "${batchId}" to GUID "${actualBatchGuid}"`
          );
        } else {
          // Assume it's already a GUID
          actualBatchGuid = batchId;
        }
      }

      for (const operationId of operationsToDuplicate) {
        // Find the operation to duplicate
        const originalOperation = operations.find(
          (op) => getOperationId(op) === operationId
        );

        if (originalOperation) {
          // Create a new operation with the same properties but new ID and batch
          const newOperation: Partial<cr2b6_operations> = {
            // Use the system GUID from the original operation's lookup value
            cr2b6_system:
              (originalOperation as any)._cr2b6_system_value ||
              originalOperation.cr2b6_system,
            cr2b6_batch: actualBatchGuid || undefined,
            cr2b6_starttime: new Date(
              new Date(originalOperation.cr2b6_starttime).getTime() +
                24 * 60 * 60 * 1000
            ), // Add 1 day
            cr2b6_endtime: new Date(
              new Date(originalOperation.cr2b6_endtime).getTime() +
                24 * 60 * 60 * 1000
            ), // Add 1 day
            cr2b6_type: originalOperation.cr2b6_type,
            cr2b6_description: originalOperation.cr2b6_description,
          };

          // Save the new operation via data provider (without ID to create new)
          const savedOperation = (await dataProvider.saveOperation(
            newOperation as any
          )) as unknown as cr2b6_operations;
          duplicatedOperations.push(savedOperation);

          // Add to operations state
          setOperations((prev) => [...prev, savedOperation]);

          // Add to timeline items
          const timelineItem = createTimelineItem(savedOperation);
          setItems((prev) => [...prev, timelineItem]);
        }
      }

      console.log(`Duplicated ${duplicatedOperations.length} operations`);
      // After duplication, replace the current selection with the newly created operations
      if (duplicatedOperations.length) {
        const newIds = new Set<string | number>(
          duplicatedOperations.map((op) => getOperationId(op))
        );
        setSelectedItems(newIds);

        // Ensure duplicated operations are visible by adjusting the group offset
        // Find the equipment groups of the duplicated operations
        const duplicatedGroupIds = new Set(
          duplicatedOperations.map(
            (op) => (op as any)._cr2b6_system_value || op.cr2b6_system
          )
        );

        // Find the indices of these groups in the groups array
        const groupIndices = Array.from(duplicatedGroupIds)
          .map((groupId) =>
            groups.findIndex((g) => String(g.id) === String(groupId))
          )
          .filter((index) => index !== -1);

        if (groupIndices.length > 0) {
          const minGroupIndex = Math.min(...groupIndices);
          const maxGroupIndex = Math.max(...groupIndices);

          // Check if any of the duplicated operations' groups are outside the current visible window
          const currentOffset = clampedOffset;
          const currentMaxVisible = currentOffset + groupsPerPage - 1;

          if (
            minGroupIndex < currentOffset ||
            maxGroupIndex > currentMaxVisible
          ) {
            // Adjust the offset to ensure the duplicated operations are visible
            // Center the view around the duplicated operations if possible
            const targetOffset = Math.max(
              0,
              Math.min(
                minGroupIndex - Math.floor(groupsPerPage / 4), // Show some context above
                groups.length - groupsPerPage
              )
            );
            setGroupOffset(targetOffset);
            console.log(
              `Adjusted group offset from ${currentOffset} to ${targetOffset} to show duplicated operations`
            );
          }
        }
      }
      // Clear the queued operations to duplicate
      setOperationsToDuplicate([]);
    } catch (error) {
      console.error("Error duplicating operations:", error);
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Debug logging
  console.log("Timeline render - groups:", groups, "items:", items);
  console.log(
    "Timeline render - displayedGroups:",
    displayedGroups,
    "displayedItems:",
    displayedItems
  );
  console.log(
    "Timeline render - groupsPerPage:",
    groupsPerPage,
    "groupOffset:",
    groupOffset,
    "filteredGroups.length:",
    filteredGroups.length
  );

  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "0", // Important for nested flex containers
        overflow: "hidden", // Prevent double scrollbars
        gap: "8px", // Space between controls and timeline
        padding: "8px 8px 10px 8px", // Slightly tighter padding
      }}
    >
      {/* Command Bar Container */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "6px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
          padding: "8px 10px",
        }}
      >
        <TimelineControls
          zoom={zoom}
          setZoom={setZoom}
          editMode={editMode}
          setEditMode={setEditMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onJumpToNow={jumpToNow}
          onAddEquipment={handleNewEquipment}
          onAddOperation={handleNewOperation}
          onManageBatches={handleManageBatches}
          onUndo={async () => {
            if (undoStackRef.current.length === 0) return;
            const target = undoStackRef.current.pop()!;
            redoStackRef.current.push(snapshotOps());
            await applyOpsFromHistory(target);
            updateHistoryStateFlags();
          }}
          onRedo={async () => {
            if (redoStackRef.current.length === 0) return;
            const target = redoStackRef.current.pop()!;
            undoStackRef.current.push(snapshotOps());
            await applyOpsFromHistory(target);
            updateHistoryStateFlags();
          }}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      {/* Timeline Container (reverted wrapper, rely on component scroll) */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "6px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
          padding: "6px 8px 4px 8px",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overscrollBehavior: "contain",
          touchAction: "none",
        }}
        ref={timelineOuterRef}
        onWheel={(e) => {
          // Always prevent page scroll while over timeline area
          e.preventDefault();
          // Zoom with ctrl/cmd + wheel
          if (e.ctrlKey || e.metaKey) {
            // Only zoom if wheel delta is significant
            if (Math.abs(e.deltaY) > 10) {
              // Calculate center of current view
              const currentStart = visibleTimeStart;
              const currentEnd = visibleTimeEnd;
              const currentCenter = (currentStart + currentEnd) / 2;
              if (e.deltaY < 0) {
                // Zoom in (go to next finer zoom level)
                setZoom((prevZoom) => {
                  const zoomOrder: ZoomLevel[] = ["hour", "day", "week", "month", "quarter", "year"];
                  const idx = zoomOrder.findIndex((z) => z === prevZoom);
                  if (idx > 0) {
                    const newZoom = zoomOrder[idx - 1] as typeof prevZoom;
                    // After zoom, recenter view
                    setTimeout(() => {
                      // Calculate new range based on new zoom
                      // Use jumpToNow logic but center on currentCenter
                      let s = new Date(currentCenter);
                      let e = new Date(currentCenter);
                      switch (newZoom) {
                        case "hour":
                          s.setHours(s.getHours() - 6);
                          e.setHours(e.getHours() + 6);
                          break;
                        case "day":
                          s.setDate(s.getDate() - 3);
                          e.setDate(e.getDate() + 3);
                          break;
                        case "week":
                          s.setDate(s.getDate() - 10);
                          e.setDate(e.getDate() + 10);
                          break;
                        case "month":
                          s.setDate(s.getDate() - 14);
                          e.setDate(e.getDate() + 13);
                          break;
                        case "quarter": {
                          const quarterStartMonth = Math.floor(s.getMonth() / 3) * 3;
                          s.setMonth(quarterStartMonth, 1);
                          s.setHours(0, 0, 0, 0);
                          const quarterEnd = new Date(e.getFullYear(), quarterStartMonth + 3, 0);
                          quarterEnd.setHours(23, 59, 59, 999);
                          e.setTime(quarterEnd.getTime());
                          break;
                        }
                        case "year":
                          s.setMonth(0, 1);
                          s.setHours(0, 0, 0, 0);
                          e.setMonth(11, 31);
                          e.setHours(23, 59, 59, 999);
                          break;
                      }
                      s.setHours(0, 0, 0, 0);
                      e.setHours(23, 59, 59, 999);
                      setStartDate(s);
                      setEndDate(e);
                    }, 0);
                    return newZoom;
                  }
                  return prevZoom;
                });
              } else {
                // Zoom out (go to next coarser zoom level)
                setZoom((prevZoom) => {
                  const zoomOrder: ZoomLevel[] = ["hour", "day", "week", "month", "quarter", "year"];
                  const idx = zoomOrder.findIndex((z) => z === prevZoom);
                  if (idx < zoomOrder.length - 1) {
                    const newZoom = zoomOrder[idx + 1] as typeof prevZoom;
                    setTimeout(() => {
                      let s = new Date(currentCenter);
                      let e = new Date(currentCenter);
                      switch (newZoom) {
                        case "hour":
                          s.setHours(s.getHours() - 6);
                          e.setHours(e.getHours() + 6);
                          break;
                        case "day":
                          s.setDate(s.getDate() - 3);
                          e.setDate(e.getDate() + 3);
                          break;
                        case "week":
                          s.setDate(s.getDate() - 10);
                          e.setDate(e.getDate() + 10);
                          break;
                        case "month":
                          s.setDate(s.getDate() - 14);
                          e.setDate(e.getDate() + 13);
                          break;
                        case "quarter": {
                          const quarterStartMonth = Math.floor(s.getMonth() / 3) * 3;
                          s.setMonth(quarterStartMonth, 1);
                          s.setHours(0, 0, 0, 0);
                          const quarterEnd = new Date(e.getFullYear(), quarterStartMonth + 3, 0);
                          quarterEnd.setHours(23, 59, 59, 999);
                          e.setTime(quarterEnd.getTime());
                          break;
                        }
                        case "year":
                          s.setMonth(0, 1);
                          s.setHours(0, 0, 0, 0);
                          e.setMonth(11, 31);
                          e.setHours(23, 59, 59, 999);
                          break;
                      }
                      s.setHours(0, 0, 0, 0);
                      e.setHours(23, 59, 59, 999);
                      setStartDate(s);
                      setEndDate(e);
                    }, 0);
                    return newZoom;
                  }
                  return prevZoom;
                });
              }
            }
            return;
          }
          // ...existing code for vertical group scroll...
          if (filteredGroups.length <= groupsPerPage) return; // nothing to virtual-scroll
          scrollAccumRef.current += e.deltaY;
          const threshold = 30; // pixels per group scroll
          while (Math.abs(scrollAccumRef.current) >= threshold) {
            const dir = scrollAccumRef.current > 0 ? 1 : -1;
            scrollAccumRef.current -= dir * threshold;
            setGroupOffset((prev) => {
              const max = Math.max(0, filteredGroups.length - groupsPerPage);
              return Math.min(Math.max(prev + dir, 0), max);
            });
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return; // left only
          const target = e.target as HTMLElement;
          const itemEl = target.closest(".rct-item");
          if (itemEl) {
            // Removed drag preview logic
            return; // let timeline internal drag proceed
          }
          // Vertical group window drag
          dragRef.current = {
            startY: e.clientY,
            startOffset: clampedOffset,
            dragging: true,
          };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragRef.current.dragging) {
            const dy = e.clientY - dragRef.current.startY;
            const groupsDelta = Math.round(-dy / GROUP_LINE_HEIGHT);
            setGroupOffset(() => {
              const base = dragRef.current.startOffset + groupsDelta;
              const max = Math.max(0, filteredGroups.length - groupsPerPage);
              return Math.min(Math.max(base, 0), max);
            });
          }
        }}
        onPointerUp={(e) => {
          if (dragRef.current.dragging) {
            dragRef.current.dragging = false;
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
          }
        }}
      >
        {/* Removed drag preview tooltip as requested */}
        {/* Removed virtual window status overlay as requested */}
        <Timeline
          groups={displayedGroups}
          items={displayedItems}
          visibleTimeStart={visibleTimeStart}
          visibleTimeEnd={visibleTimeEnd}
          onTimeChange={handleTimeChange}
          canMove={editMode}
          canResize={
            editMode ? (selectedItems.size <= 1 ? "both" : false) : false
          }
          canChangeGroup={false}
          onItemMove={handleItemMove}
          onItemResize={handleItemResize}
          onItemSelect={handleItemSelect}
          onCanvasClick={() => {
            // Clicking empty space clears selection
            if (selectedItemsRef.current.size) setSelectedItems(new Set());
          }}
          onCanvasDoubleClick={(groupId: any, time: number) => {
            if (!editMode) return;
            // groupId should be the equipment id
            const equipmentId = String(groupId);
            const start = new Date(time);
            const end = new Date(time + 24 * 60 * 60 * 1000); // default 1 day
            setSelectedOperation({
              cr2b6_operationid: undefined as any,
              cr2b6_system: equipmentId,
              cr2b6_batch: null,
              cr2b6_starttime: start,
              cr2b6_endtime: end,
              cr2b6_type: "Production",
              cr2b6_description: "",
              createdon: new Date(),
              modifiedon: new Date(),
            } as unknown as cr2b6_operations);
            setIsOperationDialogOpen(true);
          }}
          stackItems={true}
          dragSnap={30 * 60 * 1000}
          lineHeight={GROUP_LINE_HEIGHT}
          itemHeightRatio={ITEM_HEIGHT_RATIO}
          itemRenderer={({ item, getItemProps, getResizeProps }) => {
            const isSelected = selectedItems.has(item.id);
            const canResize = selectedItems.size <= 1;

            const itemPropsRaw = getItemProps({
              onClick: (e: React.MouseEvent) => {
                handleItemSelect(item.id, e);
              },
              onDoubleClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                handleEditOperation(String(item.id));
              },
              onContextMenu: (e: React.MouseEvent) => {
                if (!editMode) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  operationId: String(item.id),
                });
              },
              onMouseDown: (e: React.MouseEvent) => {
                if (editMode) {
                  (e.currentTarget as HTMLElement).style.cursor = "grabbing";
                }
              },
              onMouseUp: (e: React.MouseEvent) => {
                if (editMode) {
                  (e.currentTarget as HTMLElement).style.cursor = "grab";
                }
              },
              onMouseLeave: (e: React.MouseEvent) => {
                // Ensure cursor resets if mouse leaves while dragging ended
                if (editMode) {
                  (e.currentTarget as HTMLElement).style.cursor = "grab";
                }
              },
              style: {
                ...item.itemProps?.style,
                cursor: editMode ? "grab" : "default",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 0,
                paddingBottom: 0,
                boxSizing: "border-box",
                transform: "translateY(-6px)",
                height: "calc(100% - 6px)",
                boxShadow: isSelected
                  ? "0 0 0 1px #0078d4, 0 2px 4px rgba(0, 0, 0, 0.15)"
                  : item.itemProps?.style?.boxShadow ||
                    "0 1px 2px rgba(0, 0, 0, 0.1)",
              },
            });
            const { key: itemKey, ...itemProps } = (itemPropsRaw as any) ?? {};
            const { left: leftResizePropsRaw, right: rightResizePropsRaw } =
              getResizeProps();
            const { key: leftKey, ...leftResizeProps } =
              (leftResizePropsRaw as any) ?? {};
            const { key: rightKey, ...rightResizeProps } =
              (rightResizePropsRaw as any) ?? {};

            if (canResize && editMode && leftResizeProps) {
              (leftResizeProps as any).style = {
                ...(leftResizeProps as any).style,
                cursor: "col-resize",
              };
            }
            if (canResize && editMode && rightResizeProps) {
              (rightResizeProps as any).style = {
                ...(rightResizeProps as any).style,
                cursor: "col-resize",
              };
            }

            return (
              <div
                key={String(itemKey ?? item.id)}
                {...itemProps}
                data-selected={isSelected}
                data-op-id={item.id}
              >
                {canResize && <div key={leftKey} {...leftResizeProps} />}
                <div
                  style={{
                    height: "100%",
                    position: "relative",
                    paddingLeft: 4,
                    paddingRight: 4,
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "white",
                      fontWeight: 500,
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </div>
                </div>
                {canResize && <div key={rightKey} {...rightResizeProps} />}
              </div>
            );
          }}
          className="timeline-grid"
          style={{
            backgroundColor: "white",
            borderRadius: "2px",
          }}
          sidebarWidth={180}
          rightSidebarWidth={0}
          groupRenderer={({ group }) => (
            <div
              draggable={editMode}
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(group.id));
              }}
              onDragOver={(e) => {
                if (!editMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                if (!editMode) return;
                e.preventDefault();
                const draggedId = e.dataTransfer.getData("text/plain");
                const targetId = String(group.id);
                if (!draggedId || draggedId === targetId) return;
                // Reorder equipment array
                setEquipment((prev) => {
                  const arr = [...prev];
                  const fromIdx = arr.findIndex(
                    (eq) => String(eq.cr2b6_systemid) === draggedId
                  );
                  const toIdx = arr.findIndex(
                    (eq) => String(eq.cr2b6_systemid) === targetId
                  );
                  if (fromIdx === -1 || toIdx === -1) return prev;
                  const [moved] = arr.splice(fromIdx, 1);
                  arr.splice(toIdx, 0, moved);
                  // Reassign order numbers
                  arr.forEach((e, i) => {
                    e.cr2b6_order = i;
                    (e as any).cr2b6_order = i;
                  });
                  // Rebuild groups to reflect new order
                  rebuildGroupsFromEquipment(arr);
                  // Also update groups state directly to ensure immediate reflection
                  setGroups(
                    arr
                      .slice()
                      .sort(
                        (a, b) => (a.cr2b6_order ?? 0) - (b.cr2b6_order ?? 0)
                      )
                      .map((g) => ({
                        id: g.cr2b6_systemid,
                        title: g.cr2b6_description,
                        rightTitle: g.cr2b6_tag,
                      }))
                  );
                  // Persist order asynchronously
                  (async () => {
                    for (const eq of arr) {
                      try {
                        await dataProvider.saveEquipment({
                          cr2b6_systemid: (eq as any).cr2b6_systemid,
                          cr2b6_tag: (eq as any).cr2b6_tag,
                          cr2b6_description: (eq as any).cr2b6_description,
                          // @ts-ignore order field
                          cr2b6_order: (eq as any).cr2b6_order,
                        });
                      } catch (err) {
                        console.error("Failed to persist equipment order", err);
                      }
                    }
                  })();
                  return arr;
                });
              }}
              style={{
                cursor: editMode ? "grab" : "default",
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: "100%",
                opacity: 1,
                userSelect: "none",
              }}
              onClick={() => editMode && handleEditEquipment(group.id)}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "0.9em",
                  lineHeight: "1.2",
                }}
              >
                {group.title}
              </div>
              <div
                style={{ fontSize: "0.75em", color: "#666", lineHeight: "1.2" }}
              >
                {group.rightTitle}
              </div>
            </div>
          )}
        >
          <TimelineHeaders>
            <SidebarHeader>
              {({ getRootProps }) => {
                const rootPropsAll = getRootProps();
                const { key: rootKey, ...rootProps } =
                  (rootPropsAll as any) ?? {};
                return (
                  <div
                    key={rootKey}
                    {...rootProps}
                    style={{
                      backgroundColor: "#f8f8f8",
                      padding: "8px 10px",
                      fontWeight: "bold",
                      borderBottom: "1px solid #e0e0e0",
                      color: "#323130",
                      width: "180px",
                      boxSizing: "border-box",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    Equipment
                  </div>
                );
              }}
            </SidebarHeader>
            <DateHeader unit="primaryHeader" />
            <DateHeader />
          </TimelineHeaders>
          <TimelineMarkers>
            <TodayMarker>
              {({ styles }) => (
                <div
                  style={{
                    ...styles,
                    backgroundColor: "#e4002b", // Fluid UI red
                    width: "2px",
                  }}
                />
              )}
            </TodayMarker>
          </TimelineMarkers>
        </Timeline>
      </div>

      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onSelectBatch={handleContextMenuSelectBatch}
        onSelectBatchBelow={handleContextMenuSelectBatchBelow}
        onDuplicate={handleContextMenuDuplicate}
        onClose={handleContextMenuClose}
      />

      {/* Equipment Dialog */}
      <EquipmentDialog
        equipment={selectedEquipment}
        open={isDialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setIsDialogOpen(false);
            setSelectedEquipment(undefined);
          }
        }}
        onSave={handleSaveEquipment}
      />

      {/* Operation Dialog */}
      <OperationDialog
        operation={selectedOperation as any}
        open={isOperationDialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setIsOperationDialogOpen(false);
            setSelectedOperation(undefined);
          }
        }}
        onSave={handleSaveOperation as any}
        onDelete={selectedOperation ? handleDeleteOperation : undefined}
        equipment={equipment}
        batches={batches}
        editMode={editMode}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteConfirmationOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmationOpen(open);
          if (!open) {
            // Clear operations when dialog is closed without confirming
            setOperationToDelete(undefined);
            setOperationsToDelete([]);
          }
        }}
        onConfirm={confirmDeleteOperation}
        operationCount={
          operationsToDelete.length > 0 ? operationsToDelete.length : 1
        }
      />

      {/* Duplicate Operations Dialog */}
      <DuplicateOperationsDialog
        open={isDuplicateDialogOpen}
        operationIds={operationsToDuplicate}
        batches={batches}
        onOpenChange={setIsDuplicateDialogOpen}
        onDuplicate={handleDuplicateOperations}
      />

      {/* Batch Management Dialog */}
      <BatchManagement
        open={isBatchManagementOpen}
        batches={batches}
        onOpenChange={setIsBatchManagementOpen}
        onSaveBatch={handleSaveBatch}
      />
    </div>
  );
}
