import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Excalidraw, exportToSvg } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { EyeIcon, PencilIcon } from "../icons";

const btnClass =
  "code-block-mermaid-btn inline-flex items-center gap-1 text-xs h-6 px-1.5 text-text-muted rounded cursor-pointer transition-colors hover:text-text hover:bg-bg-emphasis";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElements = readonly any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawFiles = Record<string, any>;

interface StoredExcalidrawData {
  elements: ExcalidrawElements;
  files?: ExcalidrawFiles;
}

function parseExcalidrawData(text: string): StoredExcalidrawData {
  if (!text.trim()) return { elements: [] };
  try {
    return JSON.parse(text) as StoredExcalidrawData;
  } catch {
    return { elements: [] };
  }
}

interface ExcalidrawViewProps {
  content: string;
  editor: TiptapEditor;
  getPos: (() => number | undefined) | boolean;
  nodeSize: number;
}

export function ExcalidrawView({
  content,
  editor,
  getPos,
  nodeSize,
}: ExcalidrawViewProps) {
  const [showPreview, setShowPreview] = useState(!!content.trim());
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only parse once on mount for initial data
  const initialData = useMemo(() => parseExcalidrawData(content), []);

  // Generate SVG preview whenever content changes
  useEffect(() => {
    if (!content.trim()) {
      setSvgContent(null);
      return;
    }
    const data = parseExcalidrawData(content);
    if (!data.elements.length) {
      setSvgContent(null);
      return;
    }
    exportToSvg({
      elements: data.elements,
      appState: {
        exportWithDarkMode: false,
        exportBackground: true,
        viewBackgroundColor: "#ffffff",
      },
      files: data.files ?? null,
    }).then((svg: SVGSVGElement) => {
      const serializer = new XMLSerializer();
      setSvgContent(serializer.serializeToString(svg));
    });
  }, [content]);

  const updateNodeContent = useCallback(
    (json: string) => {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (pos == null) return;
      const { tr, schema } = editor.state;
      const nodeStart = pos + 1;
      const nodeEnd = pos + nodeSize - 1;
      editor.view.dispatch(
        tr.replaceWith(nodeStart, nodeEnd, json ? schema.text(json) : []),
      );
    },
    [editor, getPos, nodeSize],
  );

  const handleChange = useCallback(
    (elements: ExcalidrawElements, _appState: unknown, files: ExcalidrawFiles) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const json = JSON.stringify({ elements, files });
        updateNodeContent(json);
      }, 500);
    },
    [updateNodeContent],
  );

  const togglePreview = useCallback(() => setShowPreview((v) => !v), []);

  const toolbar = (
    <div
      className="code-block-language-selector"
      contentEditable={false}
      style={{ display: "flex", alignItems: "center", gap: 4 }}
    >
      <span className="text-xs text-text-muted px-1.5">Excalidraw</span>
      <button
        contentEditable={false}
        onClick={togglePreview}
        className={btnClass}
        type="button"
      >
        {showPreview ? (
          <>
            <PencilIcon className="w-3.5 h-3.5 stroke-[1.7]" />
            Edit
          </>
        ) : (
          <>
            <EyeIcon className="w-3.5 h-3.5 stroke-[1.7]" />
            Preview
          </>
        )}
      </button>
    </div>
  );

  if (showPreview) {
    return (
      <div>
        {toolbar}
        <div
          contentEditable={false}
          className="excalidraw-preview rounded-lg bg-bg-muted p-4 my-1 flex justify-center"
        >
          {svgContent ? (
            <div
              className="max-w-full"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <span className="text-xs text-text-muted italic py-8 block text-center">
              Empty drawing
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {toolbar}
      <div
        contentEditable={false}
        className="excalidraw-editor rounded-lg overflow-hidden my-1"
        style={{ height: 420 }}
      >
        <Excalidraw
          initialData={{
            elements: initialData.elements,
            files: initialData.files,
            appState: { viewBackgroundColor: "#ffffff" },
          }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
