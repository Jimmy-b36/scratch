export function addPinnedId(pinnedIds, id) {
  return pinnedIds.includes(id) ? pinnedIds : [...pinnedIds, id];
}

export function removePinnedId(pinnedIds, id) {
  return pinnedIds.filter((pinId) => pinId !== id);
}

export function togglePinnedId(pinnedIds, id) {
  return pinnedIds.includes(id)
    ? removePinnedId(pinnedIds, id)
    : addPinnedId(pinnedIds, id);
}

export function transferPinnedId(pinnedIds, fromId, toId) {
  if (fromId === toId || !pinnedIds.includes(fromId)) return pinnedIds;
  return pinnedIds.map((id) => (id === fromId ? toId : id));
}

export function remapPinnedIdsForFolderMove(pinnedIds, fromPath, toPath) {
  if (!fromPath || !toPath || fromPath === toPath) return pinnedIds;
  const fromPrefix = `${fromPath}/`;
  return pinnedIds.map((id) => {
    if (id === fromPath) return toPath;
    if (!id.startsWith(fromPrefix)) return id;
    return `${toPath}/${id.slice(fromPrefix.length)}`;
  });
}
