import {
  useCallback,
  useMemo,
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useNotesData, useNotesActions } from "../../context/NotesContext";
import {
  ListItem,
  Input,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui";
import { ChevronDownIcon, ChevronRightIcon, FolderIcon } from "../icons";
import { cleanTitle } from "../../lib/utils";
import { getDisplayItems } from "../../lib/noteSelectors";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();

  // Get start of today, yesterday, etc. (midnight local time)
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  // Today: show time
  if (date >= startOfToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // Yesterday
  if (date >= startOfYesterday) {
    return "Yesterday";
  }

  // Calculate days ago
  const daysAgo =
    Math.floor((startOfToday.getTime() - date.getTime()) / 86400000) + 1;

  // 2-6 days ago: show "X days ago"
  if (daysAgo <= 6) {
    return `${daysAgo} days ago`;
  }

  // This year: show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Different year: show full date
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Memoized note item component
interface NoteItemProps {
  id: string;
  title: string;
  preview?: string;
  modified: number;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  showFolderPrefix?: boolean;
}

interface DragDescriptor {
  type: "note" | "folder";
  id: string;
  label: string;
}

function parseDragDescriptor(rawId: string): DragDescriptor | null {
  if (rawId.startsWith("drag:note:")) {
    const id = rawId.slice("drag:note:".length);
    return { type: "note", id, label: id };
  }
  if (rawId.startsWith("drag:folder:")) {
    const id = rawId.slice("drag:folder:".length);
    const parts = id.split("/");
    return { type: "folder", id, label: parts[parts.length - 1] || id };
  }
  return null;
}

function parseDropTargetFolder(rawId: string): string | undefined {
  if (rawId.startsWith("drop:folder:")) {
    return rawId.slice("drop:folder:".length);
  }
  return undefined;
}

function parentFolderPath(path: string): string | null {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? null : path.slice(0, idx);
}

function folderName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

function DraggableNoteRow({
  item,
  depth,
  selectedNoteId,
  pinnedIds,
  selectNote,
  handleContextMenu,
  dndEnabled,
}: {
  item: DisplayItem;
  depth: number;
  selectedNoteId: string | null;
  pinnedIds: Set<string>;
  selectNote: (id: string) => Promise<void>;
  handleContextMenu: (e: React.MouseEvent, id: string) => void;
  dndEnabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag:note:${item.id}`,
    data: {
      type: "note",
      id: item.id,
      label: cleanTitle(item.title),
    } as DragDescriptor,
    disabled: !dndEnabled,
  });

  const style: CSSProperties = {
    paddingLeft: `${depth > 0 ? 8 + depth * 14 : 0}px`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...(dndEnabled ? attributes : {})} {...(dndEnabled ? listeners : {})}>
      <NoteItem
        id={item.id}
        title={item.title}
        preview={item.preview}
        modified={item.modified}
        isSelected={selectedNoteId === item.id}
        isPinned={pinnedIds.has(item.id)}
        onSelect={selectNote}
        onContextMenu={handleContextMenu}
        showFolderPrefix={false}
      />
    </div>
  );
}

function FolderRow({
  folder,
  depth,
  isExpanded,
  isDropTarget,
  onToggle,
  onContextMenu,
  dndEnabled,
}: {
  folder: FolderTreeNode;
  depth: number;
  isExpanded: boolean;
  isDropTarget: boolean;
  onToggle: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, folderPath: string) => void | Promise<void>;
  dndEnabled: boolean;
}) {
  const droppable = useDroppable({
    id: `drop:folder:${folder.path}`,
    disabled: !dndEnabled,
  });
  const draggable = useDraggable({
    id: `drag:folder:${folder.path}`,
    data: {
      type: "folder",
      id: folder.path,
      label: folder.name,
    } as DragDescriptor,
    disabled: !dndEnabled,
  });

  const setNodeRef = useCallback(
    (node: HTMLButtonElement | null) => {
      droppable.setNodeRef(node);
      draggable.setNodeRef(node);
    },
    [droppable, draggable]
  );

  return (
    <button
      ref={setNodeRef}
      onClick={() => onToggle(folder.path)}
      onContextMenu={(e) => onContextMenu(e, folder.path)}
      className={`w-full flex items-center gap-1.5 py-1.5 pr-2 rounded-md text-text-muted hover:text-text transition-colors ${
        isDropTarget ? "bg-bg-emphasis ring-1 ring-accent/60" : "hover:bg-bg-muted"
      }`}
      style={{
        paddingLeft: `${8 + depth * 14}px`,
        transform: CSS.Translate.toString(draggable.transform),
        opacity: draggable.isDragging ? 0.45 : 1,
      }}
      {...(dndEnabled ? draggable.attributes : {})}
      {...(dndEnabled ? draggable.listeners : {})}
    >
      {isExpanded ? (
        <ChevronDownIcon className="w-3.5 h-3.5 stroke-[1.9] shrink-0" />
      ) : (
        <ChevronRightIcon className="w-3.5 h-3.5 stroke-[1.9] shrink-0" />
      )}
      <FolderIcon className="w-3.75 h-3.75 stroke-[1.9] shrink-0" />
      <span className="text-xs font-medium truncate">{folder.name}</span>
    </button>
  );
}

const NoteItem = memo(function NoteItem({
  id,
  title,
  preview,
  modified,
  isSelected,
  isPinned,
  onSelect,
  onContextMenu,
  showFolderPrefix = true,
}: NoteItemProps) {
  const handleClick = useCallback(() => onSelect(id), [onSelect, id]);
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => onContextMenu(e, id),
    [onContextMenu, id]
  );

  const folder = id.includes('/') ? id.substring(0, id.lastIndexOf('/')) : null;
  const displayPreview = folder && showFolderPrefix
    ? preview ? `${folder}/ · ${preview}` : `${folder}/`
    : preview;

  return (
    <ListItem
      title={cleanTitle(title)}
      subtitle={displayPreview}
      meta={formatDate(modified)}
      isSelected={isSelected}
      isPinned={isPinned}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  );
});

interface DisplayItem {
  id: string;
  title: string;
  preview: string;
  modified: number;
}

interface FolderTreeNode {
  name: string;
  path: string;
  children: Map<string, FolderTreeNode>;
  notes: DisplayItem[];
}

function buildFolderTree(items: DisplayItem[], folderPaths: string[]): FolderTreeNode {
  const root: FolderTreeNode = {
    name: "",
    path: "",
    children: new Map(),
    notes: [],
  };

  const ensureFolder = (folderPath: string) => {
    if (!folderPath) return;
    const parts = folderPath.split("/").filter(Boolean);
    let current = root;
    let currentPath = "";

    for (const name of parts) {
      currentPath = currentPath ? `${currentPath}/${name}` : name;
      let child = current.children.get(name);
      if (!child) {
        child = {
          name,
          path: currentPath,
          children: new Map(),
          notes: [],
        };
        current.children.set(name, child);
      }
      current = child;
    }
  };

  for (const folderPath of folderPaths) {
    ensureFolder(folderPath);
  }

  for (const item of items) {
    const parts = item.id.split("/");
    if (parts.length === 1) {
      root.notes.push(item);
      continue;
    }

    const folderPath = parts.slice(0, -1).join("/");
    ensureFolder(folderPath);

    let current = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const name = parts[i];
      const child = current.children.get(name);
      if (!child) break;
      current = child;
    }

    current.notes.push(item);
  }

  return root;
}

interface NoteListProps {
  focusSignal?: number;
  toggleAllFoldersSignal?: number;
  onFolderTreeStateChange?: (allExpanded: boolean) => void;
  createRootFolderSignal?: number;
}

export function NoteList({
  focusSignal = 0,
  toggleAllFoldersSignal = 0,
  onFolderTreeStateChange,
  createRootFolderSignal = 0,
}: NoteListProps) {
  const {
    notes,
    folders,
    notesFolder,
    pinnedNoteIds,
    selectedNoteId,
    isLoading,
    searchQuery,
    searchResults,
  } = useNotesData();
  const {
    selectNote,
    deleteNote,
    duplicateNote,
    togglePinNote,
    createFolder,
    createNoteInFolder,
    deleteFolder,
    moveNote,
    moveFolder,
  } =
    useNotesActions();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState("");
  const [createFolderParentPath, setCreateFolderParentPath] = useState<string | null>(null);
  const [createFolderError, setCreateFolderError] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeDrag, setActiveDrag] = useState<DragDescriptor | null>(null);
  const [hoverDropTarget, setHoverDropTarget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHandledToggleSignalRef = useRef(0);
  const lastHandledCreateRootSignalRef = useRef(0);
  const hoverExpandTimeoutRef = useRef<number | null>(null);

  const dndEnabled = !searchQuery.trim();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  // Calculate pinned IDs set for efficient lookup
  const pinnedIds = useMemo(
    () => new Set(pinnedNoteIds),
    [pinnedNoteIds]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (noteToDelete) {
      try {
        await deleteNote(noteToDelete);
        setNoteToDelete(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    }
  }, [noteToDelete, deleteNote]);

  const handleDeleteFolderConfirm = useCallback(async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete);
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.delete(folderToDelete);
        return next;
      });
      setFolderToDelete(null);
      setDeleteFolderDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete folder";
      toast.error(message);
    }
  }, [deleteFolder, folderToDelete]);

  const handleContextMenu = useCallback(
    async (e: React.MouseEvent, noteId: string) => {
      e.preventDefault();
      const isPinned = pinnedIds.has(noteId);

      const menu = await Menu.new({
        items: [
          await MenuItem.new({
            text: isPinned ? "Unpin" : "Pin",
            action: async () => {
              try {
                await togglePinNote(noteId);
              } catch (error) {
                console.error("Failed to pin/unpin note:", error);
              }
            },
          }),
          await MenuItem.new({
            text: "Duplicate",
            action: () => duplicateNote(noteId),
          }),
          await MenuItem.new({
            text: "Copy Filepath",
            action: async () => {
              try {
                if (notesFolder) {
                  const filepath = `${notesFolder}/${noteId}.md`;
                  await invoke("copy_to_clipboard", { text: filepath });
                }
              } catch (error) {
                console.error("Failed to copy filepath:", error);
              }
            },
          }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({
            text: "Delete",
            action: () => {
              setNoteToDelete(noteId);
              setDeleteDialogOpen(true);
            },
          }),
        ],
      });

      await menu.popup();
    },
    [pinnedIds, togglePinNote, duplicateNote, notesFolder]
  );

  const openCreateFolderDialog = useCallback((parentPath: string | null) => {
    setCreateFolderParentPath(parentPath);
    setCreateFolderName("");
    setCreateFolderError(null);
    setCreateFolderDialogOpen(true);
  }, []);

  const handleCreateFolderConfirm = useCallback(async () => {
    const trimmed = createFolderName.trim();
    if (!trimmed) {
      setCreateFolderError("Folder name is required");
      return;
    }

    try {
      setIsCreatingFolder(true);
      setCreateFolderError(null);
      await createFolder(createFolderParentPath, trimmed);

      const createdPath = createFolderParentPath
        ? `${createFolderParentPath}/${trimmed}`
        : trimmed;
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (createFolderParentPath) {
          next.add(createFolderParentPath);
        }
        next.add(createdPath);
        return next;
      });

      setCreateFolderDialogOpen(false);
      setCreateFolderName("");
      setCreateFolderParentPath(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create folder";
      setCreateFolderError(message);
      toast.error(message);
    } finally {
      setIsCreatingFolder(false);
    }
  }, [createFolder, createFolderName, createFolderParentPath]);

  const handleFolderContextMenu = useCallback(
    async (e: React.MouseEvent, folderPath: string) => {
      e.preventDefault();

      const menu = await Menu.new({
        items: [
          await MenuItem.new({
            text: "New Note Here",
            action: async () => {
              try {
                await createNoteInFolder(folderPath);
                setExpandedFolders((prev) => {
                  const next = new Set(prev);
                  next.add(folderPath);
                  return next;
                });
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to create note in folder";
                toast.error(message);
              }
            },
          }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({
            text: "New Folder Here",
            action: () => openCreateFolderDialog(folderPath),
          }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({
            text: "Delete Folder",
            action: () => {
              setFolderToDelete(folderPath);
              setDeleteFolderDialogOpen(true);
            },
          }),
        ],
      });

      await menu.popup();
    },
    [createNoteInFolder, openCreateFolderDialog]
  );

  const displayItems = useMemo(
    () => getDisplayItems(notes, searchQuery, searchResults),
    [notes, searchQuery, searchResults],
  );

  const folderTree = useMemo(
    () => buildFolderTree(displayItems, folders),
    [displayItems, folders]
  );

  const allFolderPaths = useMemo(() => {
    const paths: string[] = [];
    const walk = (node: FolderTreeNode) => {
      for (const child of node.children.values()) {
        paths.push(child.path);
        walk(child);
      }
    };
    walk(folderTree);
    return paths;
  }, [folderTree]);

  useEffect(() => {
    if (!selectedNoteId || !selectedNoteId.includes("/")) return;

    const parts = selectedNoteId.split("/");
    const ancestors = new Set<string>();
    let path = "";
    for (let i = 0; i < parts.length - 1; i += 1) {
      path = path ? `${path}/${parts[i]}` : parts[i];
      ancestors.add(path);
    }

    setExpandedFolders((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const ancestor of ancestors) {
        if (!next.has(ancestor)) {
          next.add(ancestor);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedNoteId]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleAllFolders = useCallback(() => {
    if (allFolderPaths.length === 0) return;
    setExpandedFolders((prev) => {
      const allExpanded = allFolderPaths.every((path) => prev.has(path));
      return allExpanded ? new Set<string>() : new Set(allFolderPaths);
    });
  }, [allFolderPaths]);

  useEffect(() => {
    const allExpanded =
      allFolderPaths.length > 0 &&
      allFolderPaths.every((path) => expandedFolders.has(path));
    onFolderTreeStateChange?.(allExpanded);
  }, [expandedFolders, allFolderPaths, onFolderTreeStateChange]);

  useEffect(() => {
    if (focusSignal === 0) return;
    containerRef.current?.focus();
  }, [focusSignal]);

  useEffect(() => {
    if (
      toggleAllFoldersSignal === 0 ||
      toggleAllFoldersSignal === lastHandledToggleSignalRef.current
    ) {
      return;
    }
    lastHandledToggleSignalRef.current = toggleAllFoldersSignal;
    toggleAllFolders();
  }, [toggleAllFoldersSignal, toggleAllFolders]);

  useEffect(() => {
    if (
      createRootFolderSignal === 0 ||
      createRootFolderSignal === lastHandledCreateRootSignalRef.current
    ) {
      return;
    }
    lastHandledCreateRootSignalRef.current = createRootFolderSignal;
    openCreateFolderDialog(null);
  }, [createRootFolderSignal, openCreateFolderDialog]);

  useEffect(
    () => () => {
      if (hoverExpandTimeoutRef.current) {
        window.clearTimeout(hoverExpandTimeoutRef.current);
      }
    },
    []
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const descriptor = parseDragDescriptor(String(event.active.id));
    if (!descriptor) return;
    const data = event.active.data.current as Partial<DragDescriptor> | undefined;
    setActiveDrag({
      ...descriptor,
      label: data?.label || descriptor.label,
    });
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over ? String(event.over.id) : null;
      setHoverDropTarget(overId);

      const folderTarget = overId ? parseDropTargetFolder(overId) : undefined;
      if (!folderTarget) {
        if (hoverExpandTimeoutRef.current) {
          window.clearTimeout(hoverExpandTimeoutRef.current);
          hoverExpandTimeoutRef.current = null;
        }
        return;
      }

      if (expandedFolders.has(folderTarget)) return;

      if (hoverExpandTimeoutRef.current) {
        window.clearTimeout(hoverExpandTimeoutRef.current);
      }
      hoverExpandTimeoutRef.current = window.setTimeout(() => {
        setExpandedFolders((prev) => {
          if (prev.has(folderTarget)) return prev;
          const next = new Set(prev);
          next.add(folderTarget);
          return next;
        });
      }, 450);
    },
    [expandedFolders]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDrag(null);
      setHoverDropTarget(null);
      if (hoverExpandTimeoutRef.current) {
        window.clearTimeout(hoverExpandTimeoutRef.current);
        hoverExpandTimeoutRef.current = null;
      }

      const descriptor = parseDragDescriptor(String(event.active.id));
      const overId = event.over ? String(event.over.id) : null;
      const targetFolderRaw = overId === null ? null : parseDropTargetFolder(overId);
      if (!descriptor) return;
      if (overId !== null && targetFolderRaw === undefined) return;
      const targetFolder = targetFolderRaw ?? null;

      try {
        if (descriptor.type === "note") {
          const currentParent = parentFolderPath(descriptor.id);
          if (currentParent === targetFolder) return;
          await moveNote(descriptor.id, targetFolder);
          if (targetFolder) {
            setExpandedFolders((prev) => new Set(prev).add(targetFolder));
          }
          toast.success("Note moved");
          return;
        }

        if (targetFolder === descriptor.id || targetFolder?.startsWith(`${descriptor.id}/`)) {
          toast.error("Cannot move a folder into itself");
          return;
        }

        const currentParent = parentFolderPath(descriptor.id);
        if (currentParent === targetFolder) return;

        const oldPath = descriptor.id;
        const newPath = targetFolder
          ? `${targetFolder}/${folderName(descriptor.id)}`
          : folderName(descriptor.id);

        await moveFolder(descriptor.id, targetFolder);

        setExpandedFolders((prev) => {
          const next = new Set<string>();
          for (const path of prev) {
            if (path === oldPath || path.startsWith(`${oldPath}/`)) {
              const suffix = path.slice(oldPath.length);
              next.add(`${newPath}${suffix}`);
            } else {
              next.add(path);
            }
          }
          if (targetFolder) {
            next.add(targetFolder);
          }
          next.add(newPath);
          return next;
        });

        toast.success("Folder moved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Move failed");
      }
    },
    [moveNote, moveFolder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
    setHoverDropTarget(null);
    if (hoverExpandTimeoutRef.current) {
      window.clearTimeout(hoverExpandTimeoutRef.current);
      hoverExpandTimeoutRef.current = null;
    }
  }, []);

  const renderFolderTree = (node: FolderTreeNode, depth: number): ReactNode[] => {
    const rows: ReactNode[] = [];

    const childFolders = Array.from(node.children.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const folder of childFolders) {
      const isExpanded = expandedFolders.has(folder.path);
      rows.push(
        <FolderRow
          key={`folder-${folder.path}`}
          folder={folder}
          depth={depth}
          isExpanded={isExpanded}
          isDropTarget={hoverDropTarget === `drop:folder:${folder.path}`}
          onToggle={toggleFolder}
          onContextMenu={handleFolderContextMenu}
          dndEnabled={dndEnabled}
        />
      );

      if (isExpanded) {
        rows.push(...renderFolderTree(folder, depth + 1));
      }
    }

    for (const item of node.notes) {
      rows.push(
        <DraggableNoteRow
          key={item.id}
          item={item}
          depth={depth}
          selectedNoteId={selectedNoteId}
          pinnedIds={pinnedIds}
          selectNote={selectNote}
          handleContextMenu={handleContextMenu}
          dndEnabled={dndEnabled}
        />
      );
    }

    return rows;
  };

  let content: ReactNode;
  const showRootDropHint = Boolean(activeDrag) && hoverDropTarget === null;
  if (isLoading && notes.length === 0) {
    content = <div className="p-4 text-center text-text-muted select-none">Loading...</div>;
  } else if (searchQuery.trim() && displayItems.length === 0) {
    content = (
      <div className="p-4 text-center text-sm text-text-muted select-none">
        No results found
      </div>
    );
  } else if (displayItems.length === 0 && folders.length === 0) {
    content = <div className="p-4 text-center text-sm text-text-muted select-none">No notes yet</div>;
  } else {
    content = (
      <div
        ref={containerRef}
        tabIndex={0}
        className={`flex flex-col gap-1 p-1.5 outline-none rounded-md transition-colors ${
          showRootDropHint ? "bg-bg-emphasis/55 ring-1 ring-accent/35" : ""
        }`}
      >
        {showRootDropHint && (
          <div className="px-2 py-1 text-[11px] text-text-muted select-none">
            Drop here to move to root
          </div>
        )}
        {searchQuery.trim() ? (
          displayItems.map((item) => (
            <NoteItem
              key={item.id}
              id={item.id}
              title={item.title}
              preview={item.preview}
              modified={item.modified}
              isSelected={selectedNoteId === item.id}
              isPinned={pinnedIds.has(item.id)}
              onSelect={selectNote}
              onContextMenu={handleContextMenu}
            />
          ))
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={(event) => {
              void handleDragEnd(event);
            }}
            onDragCancel={handleDragCancel}
          >
            {renderFolderTree(folderTree, 0)}
            <DragOverlay>
              {activeDrag ? (
                <div className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text shadow-lg">
                  {activeDrag.type === "folder" ? "Folder: " : "Note: "}
                  {activeDrag.label}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    );
  }

  return (
    <>
      {content}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the note and all its content. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={createFolderDialogOpen}
        onOpenChange={(open) => {
          setCreateFolderDialogOpen(open);
          if (!open) {
            setCreateFolderError(null);
            setCreateFolderName("");
            setCreateFolderParentPath(null);
            setIsCreatingFolder(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New folder</AlertDialogTitle>
            <AlertDialogDescription>
              {createFolderParentPath
                ? `Create a folder inside ${createFolderParentPath}`
                : "Create a folder at the root of your notes"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              value={createFolderName}
              onChange={(e) => {
                setCreateFolderName(e.target.value);
                if (createFolderError) {
                  setCreateFolderError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateFolderConfirm();
                }
              }}
              placeholder="Folder name"
              autoFocus
            />
            {createFolderError && (
              <p className="text-xs text-red-500">{createFolderError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingFolder}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleCreateFolderConfirm();
              }}
              disabled={isCreatingFolder}
            >
              {isCreatingFolder ? "Creating..." : "Create"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteFolderDialogOpen}
        onOpenChange={(open) => {
          setDeleteFolderDialogOpen(open);
          if (!open) {
            setFolderToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {folderToDelete
                ? `This will permanently delete "${folderToDelete}" and all notes and subfolders inside it.`
                : "This will permanently delete the folder and all contents."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolderConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
