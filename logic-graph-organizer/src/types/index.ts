// Segment - represents a chunk of original text
export interface SegmentMeta {
  version?: string;
  source?: string;
  date?: string;
  tags?: string[];
}

export interface Segment {
  id: string;
  text: string;
  meta: SegmentMeta;
  selected?: boolean;
}

// Graph Node - represents a concept/rule/entity extracted from segments
export interface GraphNode {
  id: string;
  title: string;
  summary: string;
  details?: string;
  tags: string[];
  status: 'active' | 'deprecated';
  canonicalKey: string;
  sourceSegmentIds: string[];
  // Position for reactflow
  position: { x: number; y: number };
}

// Edge relation types
export type RelationType = 'hierarchy' | 'dependency' | 'reference' | 'conflict' | 'other';

// Graph Edge - represents relationship between nodes
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
  label?: string;
}

// UI State
export interface UIState {
  showDeprecated: boolean;
  searchQuery: string;
  highlightedSegmentIds: string[];
  highlightedNodeIds: string[];
  selectedNodeId: string | null;
  selectedSegmentIds: string[];
  apiKey: string;
  leftPanelWidth: number;
  rightPanelWidth: number;
}

// History state for undo/redo
export interface HistoryState {
  segments: Segment[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Complete App State
export interface AppState {
  segments: Segment[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  ui: UIState;
  history: HistoryState[];
  historyIndex: number;
}

// Gemini API response schema types
export interface GeminiNodeOutput {
  canonicalKey: string;
  title: string;
  summary: string;
  details?: string;
  tags: string[];
  sourceSegmentIds: string[];
  status: 'active' | 'deprecated';
}

export interface GeminiEdgeOutput {
  sourceCanonicalKey: string;
  targetCanonicalKey: string;
  relationType: RelationType;
  label?: string;
}

export interface GeminiExtractResponse {
  nodes: GeminiNodeOutput[];
  edges: GeminiEdgeOutput[];
  segmentToNodeKeys: Record<string, string[]>;
  warnings?: string[];
}

export interface GeminiMergeResponse {
  nodes: GeminiNodeOutput[];
  edges: GeminiEdgeOutput[];
  mergedKeys: Record<string, string>; // old key -> new key
  warnings?: string[];
}

// Export formats
export interface ExportData {
  version: string;
  exportedAt: string;
  segments: Segment[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Toast types
export type ToastType = 'success' | 'error' | 'loading' | 'info';
