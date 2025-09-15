import React, { useRef } from "react";
import {
  Edit24Regular,
  Delete24Regular,
  SelectAllOn24Regular,
  Copy24Regular,
  ArrowDownload24Regular,
} from "@fluentui/react-icons";
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
} from "@fluentui/react-components";

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onSelectBatch: () => void;
  onSelectBatchBelow: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  onEdit,
  onDelete,
  onSelectBatch,
  onSelectBatchBelow,
  onDuplicate,
  onClose,
}) => {
  const targetRef = useRef<HTMLDivElement>(null);

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  const handleSelectBatch = () => {
    onSelectBatch();
    onClose();
  };

  const handleSelectBatchBelow = () => {
    onSelectBatchBelow();
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  if (!visible) return null;

  return (
    <>
      {/* Hidden target element for positioning */}
      <div
        ref={targetRef}
        style={{
          position: "fixed",
          top: y,
          left: x,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
      />
      <Menu open={visible} onOpenChange={(_e, data) => !data.open && onClose()}>
        <MenuTrigger>
          <div
            style={{
              position: "fixed",
              top: y,
              left: x,
              width: 1,
              height: 1,
            }}
          />
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem icon={<Edit24Regular />} onClick={handleEdit}>
              Edit
            </MenuItem>
            <MenuItem
              icon={<SelectAllOn24Regular />}
              onClick={handleSelectBatch}
            >
              Select Batch
            </MenuItem>
            <MenuItem
              icon={<ArrowDownload24Regular />}
              onClick={handleSelectBatchBelow}
            >
              Select Batch Below
            </MenuItem>
            <MenuItem icon={<Copy24Regular />} onClick={handleDuplicate}>
              Duplicate
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<Delete24Regular />} onClick={handleDelete}>
              Delete
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    </>
  );
};
