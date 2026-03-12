import type { Editor as TiptapEditor } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";

function mapChildren(
  node: ProseMirrorNode,
  mapper: (child: ProseMirrorNode) => ProseMirrorNode,
): Fragment {
  const children: ProseMirrorNode[] = [];
  node.forEach((child) => {
    children.push(mapper(child));
  });
  return Fragment.fromArray(children);
}

function convertListToTaskList(editor: TiptapEditor): boolean {
  return editor
    .chain()
    .focus()
    .command(({ state, tr }) => {
      const { bulletList, orderedList, taskList, listItem, taskItem } =
        state.schema.nodes;

      if (!bulletList || !orderedList || !taskList || !listItem || !taskItem) {
        return false;
      }

      const convertNode = (node: ProseMirrorNode): ProseMirrorNode => {
        if (node.type === bulletList || node.type === orderedList) {
          return taskList.create(node.attrs, mapChildren(node, convertNode));
        }

        if (node.type === listItem) {
          return taskItem.create(
            {
              ...node.attrs,
              checked: false,
            },
            mapChildren(node, convertNode),
          );
        }

        if (node.content.childCount === 0) {
          return node;
        }

        return node.copy(mapChildren(node, convertNode));
      };

      const { $from, from, to } = state.selection;
      const targetListPositions: number[] = [];

      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const nodeAtDepth = $from.node(depth);
        if (nodeAtDepth.type === bulletList || nodeAtDepth.type === orderedList) {
          targetListPositions.push($from.before(depth));
          break;
        }
      }

      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === bulletList || node.type === orderedList) {
          targetListPositions.push(pos);
        }
        return true;
      });

      if (targetListPositions.length === 0) {
        return false;
      }

      const uniqueListPositions = Array.from(new Set(targetListPositions)).sort(
        (a, b) => b - a,
      );

      for (const originalPos of uniqueListPositions) {
        const mappedPos = tr.mapping.map(originalPos);
        const listNode = tr.doc.nodeAt(mappedPos) as ProseMirrorNode | null;
        if (!listNode) continue;
        if (listNode.type !== bulletList && listNode.type !== orderedList) {
          continue;
        }

        const replacement = convertNode(listNode);
        tr.replaceWith(mappedPos, mappedPos + listNode.nodeSize, replacement);
      }

      return true;
    })
    .run();
}

function convertListToTaskListByLiftAndWrap(editor: TiptapEditor): boolean {
  const { state } = editor;
  const { bulletList, orderedList } = state.schema.nodes;
  if (!bulletList || !orderedList) return false;

  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const nodeAtDepth = $from.node(depth);
    if (nodeAtDepth.type === bulletList || nodeAtDepth.type === orderedList) {
      const listPos = $from.before(depth);
      const from = listPos + 1;
      const to = listPos + nodeAtDepth.nodeSize - 1;

      return editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .liftListItem("listItem")
        .toggleTaskList()
        .run();
    }
  }

  return false;
}

export function toggleTaskListWithConversion(editor: TiptapEditor): boolean {
  if (editor.isActive("taskList")) {
    return editor.chain().focus().toggleTaskList().run();
  }

  if (convertListToTaskList(editor)) {
    return true;
  }

  if (convertListToTaskListByLiftAndWrap(editor)) {
    return true;
  }

  return editor.chain().focus().toggleTaskList().run();
}
