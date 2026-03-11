import { invoke } from "@tauri-apps/api/core";
import type { Note, NoteMetadata, Settings, VaultInfo } from "../types/note";

export async function getNotesFolder(): Promise<string | null> {
  return invoke("get_notes_folder");
}

export async function setNotesFolder(path: string): Promise<void> {
  return invoke("set_notes_folder", { path });
}

export async function listVaults(): Promise<VaultInfo[]> {
  return invoke("list_vaults");
}

export async function listRecentVaults(limit = 10): Promise<VaultInfo[]> {
  return invoke("list_recent_vaults", { limit });
}

export async function addVault(path: string): Promise<VaultInfo> {
  return invoke("add_vault", { path });
}

export async function setActiveVault(path: string): Promise<void> {
  return invoke("set_active_vault", { path });
}

export async function removeVault(vaultId: string): Promise<void> {
  return invoke("remove_vault", { vaultId });
}

export async function toggleFavoriteVault(vaultId: string): Promise<VaultInfo> {
  return invoke("toggle_favorite_vault", { vaultId });
}

export async function openVaultWindow(path: string): Promise<void> {
  return invoke("open_vault_window", { path });
}

export async function listNotes(): Promise<NoteMetadata[]> {
  return invoke("list_notes");
}

export async function listFolders(): Promise<string[]> {
  return invoke("list_folders");
}

export async function readNote(id: string): Promise<Note> {
  return invoke("read_note", { id });
}

export async function saveNote(id: string | null, content: string): Promise<Note> {
  return invoke("save_note", { id, content });
}

export async function deleteNote(id: string): Promise<void> {
  return invoke("delete_note", { id });
}

export async function createNote(): Promise<Note> {
  return invoke("create_note");
}

export async function createNoteInFolder(parentPath: string): Promise<Note> {
  return invoke("create_note_in_folder", { parentPath });
}

export async function createFolder(
  parentPath: string | null,
  name: string
): Promise<string> {
  return invoke("create_folder", { parentPath, name });
}

export async function deleteFolder(path: string): Promise<void> {
  return invoke("delete_folder", { path });
}

export async function duplicateNote(id: string): Promise<Note> {
  // Read the original note, then create a new one with the same content
  const original = await readNote(id);
  const newNote = await createNote();
  // Save with the original content (title will be extracted from content)
  const duplicatedContent = original.content.replace(/^# (.+)$/m, (_, title) => `# ${title} (Copy)`);
  return saveNote(newNote.id, duplicatedContent || original.content);
}

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { newSettings: settings });
}

export interface SearchResult {
  id: string;
  title: string;
  preview: string;
  modified: number;
  score: number;
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  return invoke("search_notes", { query });
}

export async function startFileWatcher(): Promise<void> {
  return invoke("start_file_watcher");
}
