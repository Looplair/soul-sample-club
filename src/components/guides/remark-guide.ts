// Tiny remark plugin for guide Markdown (no extra dependencies):
//   > [!TIP] / [!WARNING] / [!SSC] / [!CHRIS]  ->  styled callout boxes
//   a paragraph that is only [Name](pack:<uuid>) ->  <pack-embed> block

/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = { type: string; children?: Node[]; value?: string; url?: string; data?: any };

const CALLOUT = /^\[!(TIP|WARNING|SSC|CHRIS)\]\s*/;

function walk(node: Node) {
  if (node.type === "blockquote") {
    const firstPara = node.children?.[0];
    const firstText = firstPara?.children?.[0];
    const match = firstText?.type === "text" ? firstText.value?.match(CALLOUT) : null;
    if (match && firstText) {
      firstText.value = firstText.value!.replace(CALLOUT, "");
      node.data = { ...node.data, hProperties: { "data-callout": match[1].toLowerCase() } };
    }
  }

  if (node.type === "paragraph" && node.children?.length === 1) {
    const only = node.children[0];
    if (only.type === "link" && only.url?.startsWith("pack:")) {
      node.data = {
        ...node.data,
        hName: "pack-embed",
        hProperties: { "data-pack-id": only.url.slice("pack:".length) },
      };
      node.children = [];
    }
  }

  node.children?.forEach(walk);
}

export function remarkGuide() {
  return (tree: Node) => walk(tree);
}
