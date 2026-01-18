import type { Segment, GraphNode, GraphEdge, ExportData } from '../types';

/**
 * Export data to JSON format
 */
export function exportToJSON(
  segments: Segment[],
  nodes: GraphNode[],
  edges: GraphEdge[]
): string {
  const data: ExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    segments,
    nodes,
    edges,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
export function importFromJSON(jsonString: string): ExportData {
  const data = JSON.parse(jsonString) as ExportData;

  // Validate structure
  if (!data.segments || !data.nodes || !data.edges) {
    throw new Error('无效的数据格式：缺少必要字段');
  }

  return data;
}

/**
 * Export graph to Markdown outline
 */
export function exportToMarkdown(
  nodes: GraphNode[],
  edges: GraphEdge[],
  includeDeprecated: boolean = false
): string {
  const filteredNodes = includeDeprecated
    ? nodes
    : nodes.filter(n => n.status === 'active');

  // Build hierarchy tree
  const childEdges = edges.filter(e => e.relationType === 'hierarchy');
  const childMap = new Map<string, string[]>();
  const parentSet = new Set<string>();

  childEdges.forEach(edge => {
    const children = childMap.get(edge.source) || [];
    children.push(edge.target);
    childMap.set(edge.source, children);
    parentSet.add(edge.target);
  });

  // Find root nodes (not a child of anyone)
  const rootNodes = filteredNodes.filter(n => !parentSet.has(n.id));

  // Generate markdown recursively
  function nodeToMarkdown(node: GraphNode, depth: number): string {
    const prefix = '#'.repeat(Math.min(depth + 1, 6)) + ' ';
    const deprecatedMark = node.status === 'deprecated' ? ' ~~[已废弃]~~' : '';
    const tags = node.tags.length > 0 ? ` \`${node.tags.join('` `')}\`` : '';

    let md = `${prefix}${node.title}${deprecatedMark}${tags}\n\n`;
    md += `${node.summary}\n\n`;

    if (node.details) {
      md += `${node.details}\n\n`;
    }

    // Process children
    const children = childMap.get(node.id) || [];
    children.forEach(childId => {
      const childNode = filteredNodes.find(n => n.id === childId);
      if (childNode) {
        md += nodeToMarkdown(childNode, depth + 1);
      }
    });

    return md;
  }

  let markdown = '# 业务逻辑图谱\n\n';
  markdown += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

  rootNodes.forEach(node => {
    markdown += nodeToMarkdown(node, 1);
  });

  // Add relationships section
  const nonHierarchyEdges = edges.filter(e => e.relationType !== 'hierarchy');
  if (nonHierarchyEdges.length > 0) {
    markdown += '---\n\n## 关系说明\n\n';

    const relationTypeNames: Record<string, string> = {
      dependency: '依赖',
      reference: '引用',
      conflict: '冲突',
      other: '其他',
    };

    nonHierarchyEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (sourceNode && targetNode) {
        const label = edge.label ? ` (${edge.label})` : '';
        markdown += `- **${sourceNode.title}** → ${relationTypeNames[edge.relationType] || edge.relationType} → **${targetNode.title}**${label}\n`;
      }
    });
  }

  return markdown;
}

/**
 * Export to Mermaid mindmap format
 */
export function exportToMermaid(
  nodes: GraphNode[],
  edges: GraphEdge[],
  includeDeprecated: boolean = false
): string {
  const filteredNodes = includeDeprecated
    ? nodes
    : nodes.filter(n => n.status === 'active');

  // Build hierarchy tree
  const childEdges = edges.filter(e => e.relationType === 'hierarchy');
  const childMap = new Map<string, string[]>();
  const parentSet = new Set<string>();

  childEdges.forEach(edge => {
    const children = childMap.get(edge.source) || [];
    children.push(edge.target);
    childMap.set(edge.source, children);
    parentSet.add(edge.target);
  });

  // Find root nodes
  const rootNodes = filteredNodes.filter(n => !parentSet.has(n.id));

  // Sanitize text for mermaid
  function sanitize(text: string): string {
    return text
      .replace(/[()[\]{}]/g, '')
      .replace(/"/g, "'")
      .substring(0, 50);
  }

  // Generate mermaid syntax recursively
  function nodeToMermaid(node: GraphNode, depth: number): string {
    const indent = '  '.repeat(depth);
    const mark = node.status === 'deprecated' ? '~~' : '';
    let mermaid = `${indent}${mark}${sanitize(node.title)}${mark}\n`;

    const children = childMap.get(node.id) || [];
    children.forEach(childId => {
      const childNode = filteredNodes.find(n => n.id === childId);
      if (childNode) {
        mermaid += nodeToMermaid(childNode, depth + 1);
      }
    });

    return mermaid;
  }

  let mermaid = 'mindmap\n';
  mermaid += '  root((业务逻辑))\n';

  rootNodes.forEach(node => {
    mermaid += nodeToMermaid(node, 2);
  });

  return mermaid;
}

/**
 * Export to Mermaid flowchart for relationships
 */
export function exportToMermaidFlowchart(
  nodes: GraphNode[],
  edges: GraphEdge[],
  includeDeprecated: boolean = false
): string {
  const filteredNodes = includeDeprecated
    ? nodes
    : nodes.filter(n => n.status === 'active');

  const nodeIds = new Set(filteredNodes.map(n => n.id));

  // Sanitize for mermaid IDs
  function toId(id: string): string {
    return id.replace(/-/g, '_').substring(0, 20);
  }

  function sanitize(text: string): string {
    return text
      .replace(/[()[\]{}]/g, '')
      .replace(/"/g, "'")
      .substring(0, 30);
  }

  let mermaid = 'flowchart TD\n';

  // Define nodes
  filteredNodes.forEach(node => {
    const shape = node.status === 'deprecated' ? `[/"${sanitize(node.title)}"/]` : `["${sanitize(node.title)}"]`;
    mermaid += `  ${toId(node.id)}${shape}\n`;
  });

  mermaid += '\n';

  // Define edges
  const relationArrows: Record<string, string> = {
    hierarchy: '-->',
    dependency: '-.->',
    reference: '-->',
    conflict: 'x--x',
    other: '---',
  };

  edges.forEach(edge => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      const arrow = relationArrows[edge.relationType] || '-->';
      const label = edge.label ? `|${edge.label}|` : '';
      mermaid += `  ${toId(edge.source)} ${arrow}${label} ${toId(edge.target)}\n`;
    }
  });

  return mermaid;
}

/**
 * Download text as file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}
