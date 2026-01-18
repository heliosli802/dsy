import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  EdgeProps,
  Handle,
  Position,
  MarkerType,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../stores/useAppStore';
import type { RelationType } from '../../types';
import './GraphCanvas.css';

// Custom node data type
interface CustomNodeData {
  nodeId: string;
  title: string;
  summary: string;
  tags: string[];
  status: 'active' | 'deprecated';
  sourceSegmentIds: string[];
}

// Custom Node Component
interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
}

const CustomNode = ({ data, selected }: CustomNodeProps) => {
  const { setSelectedNodeId, setHighlightedSegmentIds, ui } = useAppStore();
  const isHighlighted = ui.highlightedNodeIds.includes(data.nodeId);
  const isDeprecated = data.status === 'deprecated';

  const handleClick = useCallback(() => {
    setSelectedNodeId(data.nodeId);
    setHighlightedSegmentIds(data.sourceSegmentIds || []);
  }, [data.nodeId, data.sourceSegmentIds, setSelectedNodeId, setHighlightedSegmentIds]);

  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isDeprecated ? 'deprecated' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Top} />
      <div className="node-content">
        <div className="node-title">{data.title}</div>
        <div className="node-summary">{data.summary}</div>
        {data.tags && data.tags.length > 0 && (
          <div className="node-tags">
            {data.tags.slice(0, 3).map((tag: string, idx: number) => (
              <span key={idx} className="node-tag">{tag}</span>
            ))}
            {data.tags.length > 3 && (
              <span className="node-tag more">+{data.tags.length - 3}</span>
            )}
          </div>
        )}
        {isDeprecated && <div className="deprecated-badge">已废弃</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="target" position={Position.Left} id="left" />
    </div>
  );
};

// Custom edge data type
interface CustomEdgeData {
  relationType: RelationType;
  label?: string;
}

// Custom Edge Component
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps & { data?: CustomEdgeData }) => {
  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX} ${(sourceY + targetY) / 2} ${targetX} ${(sourceY + targetY) / 2} ${targetX} ${targetY}`;

  const relationColors: Record<RelationType, string> = {
    hierarchy: '#3b82f6',
    dependency: '#8b5cf6',
    reference: '#10b981',
    conflict: '#ef4444',
    other: '#6b7280',
  };

  const color = relationColors[data?.relationType as RelationType] || '#6b7280';

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{ ...style, stroke: color, strokeWidth: 2 }}
        markerEnd={markerEnd}
      />
      {data?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 10}
          className="edge-label"
          style={{ fill: color }}
        >
          {data.label}
        </text>
      )}
    </>
  );
};

const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

// Trash Zone Component
const TrashZone = ({ isOver }: { isOver: boolean }) => {
  return (
    <div className={`trash-zone ${isOver ? 'active' : ''}`}>
      <div className="trash-icon">🗑️</div>
      <div className="trash-text">拖拽到此处废弃</div>
    </div>
  );
};

// Context Menu
interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string | null;
  edgeId: string | null;
  onClose: () => void;
}

const ContextMenu = ({ x, y, nodeId, edgeId, onClose }: ContextMenuProps) => {
  const { deleteNode, deprecateNode, restoreNode, deleteEdge, updateEdge, nodes, edges } = useAppStore();

  const node = nodeId ? nodes.find(n => n.id === nodeId) : null;
  const edge = edgeId ? edges.find(e => e.id === edgeId) : null;

  const handleDelete = () => {
    if (nodeId) deleteNode(nodeId);
    if (edgeId) deleteEdge(edgeId);
    onClose();
  };

  const handleDeprecate = () => {
    if (nodeId) deprecateNode(nodeId);
    onClose();
  };

  const handleRestore = () => {
    if (nodeId) restoreNode(nodeId);
    onClose();
  };

  const handleChangeEdgeType = (relationType: RelationType) => {
    if (edgeId) {
      updateEdge(edgeId, { relationType });
    }
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {node && (
        <>
          <div className="menu-header">{node.title}</div>
          {node.status === 'active' ? (
            <button onClick={handleDeprecate}>
              <span>🚫</span> 标记废弃
            </button>
          ) : (
            <button onClick={handleRestore}>
              <span>✅</span> 恢复
            </button>
          )}
          <button onClick={handleDelete} className="danger">
            <span>🗑️</span> 删除
          </button>
        </>
      )}
      {edge && (
        <>
          <div className="menu-header">修改关系类型</div>
          <button onClick={() => handleChangeEdgeType('hierarchy')}>
            <span>📂</span> 层级关系
          </button>
          <button onClick={() => handleChangeEdgeType('dependency')}>
            <span>🔗</span> 依赖关系
          </button>
          <button onClick={() => handleChangeEdgeType('reference')}>
            <span>📎</span> 引用关系
          </button>
          <button onClick={() => handleChangeEdgeType('conflict')}>
            <span>⚠️</span> 冲突关系
          </button>
          <button onClick={() => handleChangeEdgeType('other')}>
            <span>📌</span> 其他关系
          </button>
          <hr />
          <button onClick={handleDelete} className="danger">
            <span>🗑️</span> 删除连线
          </button>
        </>
      )}
    </div>
  );
};

// Main Canvas Component
const GraphCanvasInner = () => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    ui,
    updateNodePosition,
    addEdge: addStoreEdge,
    deprecateNode,
    saveToHistory,
  } = useAppStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string | null;
    edgeId: string | null;
  } | null>(null);

  const [isOverTrash, setIsOverTrash] = useState(false);
  const draggedNodeRef = useRef<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Convert store nodes to ReactFlow nodes
  const flowNodes: Node[] = useMemo(() => {
    return storeNodes
      .filter(n => ui.showDeprecated || n.status === 'active')
      .filter(n => {
        if (!ui.searchQuery) return true;
        const query = ui.searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(query) ||
          n.summary.toLowerCase().includes(query) ||
          n.tags.some(t => t.toLowerCase().includes(query))
        );
      })
      .map(node => ({
        id: node.id,
        type: 'custom',
        position: node.position,
        data: {
          nodeId: node.id,
          title: node.title,
          summary: node.summary,
          tags: node.tags,
          status: node.status,
          sourceSegmentIds: node.sourceSegmentIds,
        },
      }));
  }, [storeNodes, ui.showDeprecated, ui.searchQuery]);

  // Convert store edges to ReactFlow edges
  const flowEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(flowNodes.map(n => n.id));
    return storeEdges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        data: {
          relationType: edge.relationType,
          label: edge.label,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }));
  }, [storeEdges, flowNodes]);

  const [nodes, setNodes] = useNodesState(flowNodes);
  const [edges, setEdges] = useEdgesState(flowEdges);

  // Sync with store
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      // Update positions in store
      changes.forEach(change => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [setNodes, updateNodePosition]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        saveToHistory();
        addStoreEdge({
          source: params.source,
          target: params.target,
          relationType: 'hierarchy',
        });
      }
    },
    [addStoreEdge, saveToHistory]
  );

  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    draggedNodeRef.current = node.id;
  }, []);

  const onNodeDrag = useCallback((event: React.MouseEvent, _node: Node) => {
    if (!reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const trashZone = {
      x: bounds.right - 150,
      y: bounds.bottom - 100,
      width: 130,
      height: 80,
    };

    const isOver =
      event.clientX > trashZone.x &&
      event.clientX < trashZone.x + trashZone.width &&
      event.clientY > trashZone.y &&
      event.clientY < trashZone.y + trashZone.height;

    setIsOverTrash(isOver);
  }, []);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node) => {
    if (isOverTrash && draggedNodeRef.current) {
      saveToHistory();
      deprecateNode(draggedNodeRef.current);
    }
    setIsOverTrash(false);
    draggedNodeRef.current = null;
  }, [isOverTrash, deprecateNode, saveToHistory]);

  const onContextMenu = useCallback((event: React.MouseEvent, node?: Node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node?.id || null,
      edgeId: null,
    });
  }, []);

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      edgeId: edge.id,
    });
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <div className="graph-canvas" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'custom',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.status === 'deprecated') return '#ef4444';
            return '#3b82f6';
          }}
        />
      </ReactFlow>

      <TrashZone isOver={isOverTrash} />

      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={() => setContextMenu(null)} />
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            edgeId={contextMenu.edgeId}
            onClose={() => setContextMenu(null)}
          />
        </>
      )}

      {storeNodes.length === 0 && (
        <div className="empty-canvas">
          <div className="empty-icon">📊</div>
          <div className="empty-title">画布为空</div>
          <div className="empty-hint">
            在左侧输入文本并使用 AI 生成节点，<br />
            或加载示例数据体验功能
          </div>
        </div>
      )}
    </div>
  );
};

export const GraphCanvas = () => {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
};
