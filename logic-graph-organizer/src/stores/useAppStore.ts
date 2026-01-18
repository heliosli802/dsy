import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  Segment,
  GraphNode,
  GraphEdge,
  UIState,
  HistoryState,
  RelationType,
  GeminiExtractResponse,
} from '../types';

const MAX_HISTORY = 50;

interface AppStore {
  // Data
  segments: Segment[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  ui: UIState;

  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;

  // Segment actions
  addSegments: (segments: Segment[]) => void;
  updateSegment: (id: string, updates: Partial<Segment>) => void;
  deleteSegment: (id: string) => void;
  clearSegments: () => void;
  toggleSegmentSelection: (id: string) => void;
  selectAllSegments: () => void;
  deselectAllSegments: () => void;
  setSegments: (segments: Segment[]) => void;

  // Node actions
  addNode: (node: Omit<GraphNode, 'id'>) => string;
  addNodes: (nodes: GraphNode[]) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  deleteNode: (id: string) => void;
  deprecateNode: (id: string) => void;
  restoreNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  clearNodes: () => void;
  setNodes: (nodes: GraphNode[]) => void;

  // Edge actions
  addEdge: (edge: Omit<GraphEdge, 'id'>) => string;
  addEdges: (edges: GraphEdge[]) => void;
  updateEdge: (id: string, updates: Partial<GraphEdge>) => void;
  deleteEdge: (id: string) => void;
  clearEdges: () => void;
  setEdges: (edges: GraphEdge[]) => void;

  // UI actions
  setShowDeprecated: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setHighlightedSegmentIds: (ids: string[]) => void;
  setHighlightedNodeIds: (ids: string[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedSegmentIds: (ids: string[]) => void;
  setApiKey: (key: string) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // History actions
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Bulk actions
  clearAll: () => void;
  importData: (data: { segments: Segment[]; nodes: GraphNode[]; edges: GraphEdge[] }) => void;

  // AI integration helper
  mergeGeminiResponse: (response: GeminiExtractResponse, selectedSegmentIds: string[]) => void;
}

const initialUIState: UIState = {
  showDeprecated: false,
  searchQuery: '',
  highlightedSegmentIds: [],
  highlightedNodeIds: [],
  selectedNodeId: null,
  selectedSegmentIds: [],
  apiKey: '',
  leftPanelWidth: 320,
  rightPanelWidth: 300,
};

export const useAppStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      segments: [],
      nodes: [],
      edges: [],
      ui: initialUIState,
      history: [],
      historyIndex: -1,

      // Segment actions
      addSegments: (newSegments) => set((state) => {
        state.segments.push(...newSegments);
      }),

      updateSegment: (id, updates) => set((state) => {
        const index = state.segments.findIndex(s => s.id === id);
        if (index !== -1) {
          Object.assign(state.segments[index], updates);
        }
      }),

      deleteSegment: (id) => set((state) => {
        state.segments = state.segments.filter(s => s.id !== id);
      }),

      clearSegments: () => set((state) => {
        state.segments = [];
      }),

      toggleSegmentSelection: (id) => set((state) => {
        const index = state.segments.findIndex(s => s.id === id);
        if (index !== -1) {
          state.segments[index].selected = !state.segments[index].selected;
        }
      }),

      selectAllSegments: () => set((state) => {
        state.segments.forEach(s => { s.selected = true; });
      }),

      deselectAllSegments: () => set((state) => {
        state.segments.forEach(s => { s.selected = false; });
      }),

      setSegments: (segments) => set((state) => {
        state.segments = segments;
      }),

      // Node actions
      addNode: (nodeData) => {
        const id = uuidv4();
        set((state) => {
          state.nodes.push({ ...nodeData, id } as GraphNode);
        });
        return id;
      },

      addNodes: (newNodes) => set((state) => {
        state.nodes.push(...newNodes);
      }),

      updateNode: (id, updates) => set((state) => {
        const index = state.nodes.findIndex(n => n.id === id);
        if (index !== -1) {
          Object.assign(state.nodes[index], updates);
        }
      }),

      deleteNode: (id) => set((state) => {
        state.nodes = state.nodes.filter(n => n.id !== id);
        state.edges = state.edges.filter(e => e.source !== id && e.target !== id);
        if (state.ui.selectedNodeId === id) {
          state.ui.selectedNodeId = null;
        }
      }),

      deprecateNode: (id) => set((state) => {
        const index = state.nodes.findIndex(n => n.id === id);
        if (index !== -1) {
          state.nodes[index].status = 'deprecated';
        }
      }),

      restoreNode: (id) => set((state) => {
        const index = state.nodes.findIndex(n => n.id === id);
        if (index !== -1) {
          state.nodes[index].status = 'active';
        }
      }),

      updateNodePosition: (id, position) => set((state) => {
        const index = state.nodes.findIndex(n => n.id === id);
        if (index !== -1) {
          state.nodes[index].position = position;
        }
      }),

      clearNodes: () => set((state) => {
        state.nodes = [];
        state.edges = [];
        state.ui.selectedNodeId = null;
      }),

      setNodes: (nodes) => set((state) => {
        state.nodes = nodes;
      }),

      // Edge actions
      addEdge: (edgeData) => {
        const id = uuidv4();
        set((state) => {
          // Check if edge already exists
          const exists = state.edges.some(
            e => e.source === edgeData.source && e.target === edgeData.target
          );
          if (!exists) {
            state.edges.push({ ...edgeData, id } as GraphEdge);
          }
        });
        return id;
      },

      addEdges: (newEdges) => set((state) => {
        newEdges.forEach(edge => {
          const exists = state.edges.some(
            e => e.source === edge.source && e.target === edge.target
          );
          if (!exists) {
            state.edges.push(edge);
          }
        });
      }),

      updateEdge: (id, updates) => set((state) => {
        const index = state.edges.findIndex(e => e.id === id);
        if (index !== -1) {
          Object.assign(state.edges[index], updates);
        }
      }),

      deleteEdge: (id) => set((state) => {
        state.edges = state.edges.filter(e => e.id !== id);
      }),

      clearEdges: () => set((state) => {
        state.edges = [];
      }),

      setEdges: (edges) => set((state) => {
        state.edges = edges;
      }),

      // UI actions
      setShowDeprecated: (show) => set((state) => {
        state.ui.showDeprecated = show;
      }),

      setSearchQuery: (query) => set((state) => {
        state.ui.searchQuery = query;
      }),

      setHighlightedSegmentIds: (ids) => set((state) => {
        state.ui.highlightedSegmentIds = ids;
      }),

      setHighlightedNodeIds: (ids) => set((state) => {
        state.ui.highlightedNodeIds = ids;
      }),

      setSelectedNodeId: (id) => set((state) => {
        state.ui.selectedNodeId = id;
        // When selecting a node, highlight its source segments
        if (id) {
          const node = state.nodes.find(n => n.id === id);
          if (node) {
            state.ui.highlightedSegmentIds = node.sourceSegmentIds;
          }
        } else {
          state.ui.highlightedSegmentIds = [];
        }
      }),

      setSelectedSegmentIds: (ids) => set((state) => {
        state.ui.selectedSegmentIds = ids;
      }),

      setApiKey: (key) => set((state) => {
        state.ui.apiKey = key;
      }),

      setLeftPanelWidth: (width) => set((state) => {
        state.ui.leftPanelWidth = width;
      }),

      setRightPanelWidth: (width) => set((state) => {
        state.ui.rightPanelWidth = width;
      }),

      // History actions
      saveToHistory: () => set((state) => {
        const currentState: HistoryState = {
          segments: JSON.parse(JSON.stringify(state.segments)),
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        };

        // Remove any future history if we're in the middle
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(currentState);

        // Limit history size
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }

        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      }),

      undo: () => set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          const prevState = state.history[state.historyIndex];
          state.segments = prevState.segments;
          state.nodes = prevState.nodes;
          state.edges = prevState.edges;
        }
      }),

      redo: () => set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          const nextState = state.history[state.historyIndex];
          state.segments = nextState.segments;
          state.nodes = nextState.nodes;
          state.edges = nextState.edges;
        }
      }),

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // Bulk actions
      clearAll: () => set((state) => {
        state.segments = [];
        state.nodes = [];
        state.edges = [];
        state.ui.selectedNodeId = null;
        state.ui.highlightedSegmentIds = [];
        state.ui.highlightedNodeIds = [];
        state.history = [];
        state.historyIndex = -1;
      }),

      importData: (data) => set((state) => {
        state.segments = data.segments;
        state.nodes = data.nodes;
        state.edges = data.edges;
        state.ui.selectedNodeId = null;
        state.ui.highlightedSegmentIds = [];
        state.ui.highlightedNodeIds = [];
      }),

      // AI integration helper - merge Gemini response into existing graph
      mergeGeminiResponse: (response, _selectedSegmentIds) => set((state) => {
        const { nodes: newNodes, edges: newEdges } = response;

        // Build a map of existing nodes by canonicalKey
        const existingNodesByKey = new Map<string, GraphNode>();
        state.nodes.forEach(node => {
          existingNodesByKey.set(node.canonicalKey, node);
        });

        // Map from canonicalKey to actual node id
        const keyToId = new Map<string, string>();
        state.nodes.forEach(node => {
          keyToId.set(node.canonicalKey, node.id);
        });

        // Process new nodes
        const nodePositions = new Map<string, { x: number; y: number }>();
        let offsetX = 100;
        let offsetY = 100;

        // Calculate initial positions in a grid
        const gridCols = Math.ceil(Math.sqrt(newNodes.length));
        newNodes.forEach((newNode, idx) => {
          const col = idx % gridCols;
          const row = Math.floor(idx / gridCols);
          nodePositions.set(newNode.canonicalKey, {
            x: offsetX + col * 250,
            y: offsetY + row * 150,
          });
        });

        newNodes.forEach((newNode) => {
          const existing = existingNodesByKey.get(newNode.canonicalKey);

          if (existing) {
            // Merge with existing node
            const mergedTags = [...new Set([...existing.tags, ...newNode.tags])];
            const mergedSourceIds = [...new Set([...existing.sourceSegmentIds, ...newNode.sourceSegmentIds])];

            const index = state.nodes.findIndex(n => n.id === existing.id);
            if (index !== -1) {
              state.nodes[index].tags = mergedTags;
              state.nodes[index].sourceSegmentIds = mergedSourceIds;
              // Keep the longer/more complete summary/details
              if (newNode.summary.length > state.nodes[index].summary.length) {
                state.nodes[index].summary = newNode.summary;
              }
              if (newNode.details && (!state.nodes[index].details || newNode.details.length > state.nodes[index].details.length)) {
                state.nodes[index].details = newNode.details;
              }
              // Update status if new one is deprecated
              if (newNode.status === 'deprecated') {
                state.nodes[index].status = 'deprecated';
              }
            }
          } else {
            // Add new node
            const id = uuidv4();
            keyToId.set(newNode.canonicalKey, id);

            const position = nodePositions.get(newNode.canonicalKey) || { x: 100, y: 100 };

            state.nodes.push({
              id,
              title: newNode.title,
              summary: newNode.summary,
              details: newNode.details,
              tags: newNode.tags,
              status: newNode.status,
              canonicalKey: newNode.canonicalKey,
              sourceSegmentIds: newNode.sourceSegmentIds,
              position,
            });
          }
        });

        // Process edges
        newEdges.forEach((newEdge) => {
          const sourceId = keyToId.get(newEdge.sourceCanonicalKey);
          const targetId = keyToId.get(newEdge.targetCanonicalKey);

          if (sourceId && targetId) {
            // Check if edge already exists
            const exists = state.edges.some(
              e => e.source === sourceId && e.target === targetId
            );

            if (!exists) {
              state.edges.push({
                id: uuidv4(),
                source: sourceId,
                target: targetId,
                relationType: newEdge.relationType as RelationType,
                label: newEdge.label,
              });
            }
          }
        });
      }),
    })),
    {
      name: 'logic-graph-organizer-storage',
      partialize: (state) => ({
        segments: state.segments,
        nodes: state.nodes,
        edges: state.edges,
        ui: {
          showDeprecated: state.ui.showDeprecated,
          apiKey: state.ui.apiKey,
          leftPanelWidth: state.ui.leftPanelWidth,
          rightPanelWidth: state.ui.rightPanelWidth,
        },
      }),
    }
  )
);
