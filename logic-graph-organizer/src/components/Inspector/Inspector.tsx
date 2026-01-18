import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import type { GraphNode, RelationType } from '../../types';
import './Inspector.css';

const relationTypeLabels: Record<RelationType, string> = {
  hierarchy: '层级',
  dependency: '依赖',
  reference: '引用',
  conflict: '冲突',
  other: '其他',
};

export const Inspector: React.FC = () => {
  const {
    nodes,
    edges,
    segments,
    ui,
    updateNode,
    setSelectedNodeId,
    setHighlightedSegmentIds,
    setHighlightedNodeIds,
    restoreNode,
    deleteNode,
    saveToHistory,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'details' | 'deprecated'>('details');
  const [editingField, setEditingField] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === ui.selectedNodeId) || null;
  }, [nodes, ui.selectedNodeId]);

  const deprecatedNodes = useMemo(() => {
    return nodes.filter(n => n.status === 'deprecated');
  }, [nodes]);

  // Get edges connected to selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNode) return { incoming: [], outgoing: [] };

    const incoming = edges
      .filter(e => e.target === selectedNode.id)
      .map(e => ({
        ...e,
        sourceNode: nodes.find(n => n.id === e.source),
      }));

    const outgoing = edges
      .filter(e => e.source === selectedNode.id)
      .map(e => ({
        ...e,
        targetNode: nodes.find(n => n.id === e.target),
      }));

    return { incoming, outgoing };
  }, [selectedNode, edges, nodes]);

  // Get source segments for selected node
  const sourceSegments = useMemo(() => {
    if (!selectedNode) return [];
    return segments.filter(s => selectedNode.sourceSegmentIds.includes(s.id));
  }, [selectedNode, segments]);

  const handleFieldEdit = (field: keyof GraphNode, value: string | string[]) => {
    if (!selectedNode) return;
    saveToHistory();
    updateNode(selectedNode.id, { [field]: value } as Partial<GraphNode>);
    setEditingField(null);
  };

  const handleNavigateToNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setHighlightedNodeIds([nodeId]);
  };

  const handleNavigateToSegment = (segmentId: string) => {
    setHighlightedSegmentIds([segmentId]);
  };

  const handleRestoreNode = (nodeId: string) => {
    saveToHistory();
    restoreNode(nodeId);
  };

  const handleDeleteNode = (nodeId: string) => {
    saveToHistory();
    deleteNode(nodeId);
  };

  return (
    <div className="inspector">
      <div className="inspector-tabs">
        <button
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          节点详情
        </button>
        <button
          className={`tab ${activeTab === 'deprecated' ? 'active' : ''}`}
          onClick={() => setActiveTab('deprecated')}
        >
          废弃列表 ({deprecatedNodes.length})
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="inspector-content">
          {selectedNode ? (
            <div className="node-details">
              {/* Title */}
              <div className="detail-section">
                <label>标题</label>
                {editingField === 'title' ? (
                  <input
                    type="text"
                    defaultValue={selectedNode.title}
                    autoFocus
                    onBlur={(e) => handleFieldEdit('title', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFieldEdit('title', e.currentTarget.value);
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                ) : (
                  <div
                    className="editable-value"
                    onClick={() => setEditingField('title')}
                  >
                    {selectedNode.title}
                    <span className="edit-hint">点击编辑</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="detail-section">
                <label>摘要</label>
                {editingField === 'summary' ? (
                  <textarea
                    defaultValue={selectedNode.summary}
                    autoFocus
                    rows={3}
                    onBlur={(e) => handleFieldEdit('summary', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                ) : (
                  <div
                    className="editable-value multiline"
                    onClick={() => setEditingField('summary')}
                  >
                    {selectedNode.summary}
                    <span className="edit-hint">点击编辑</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="detail-section">
                <label>详细说明</label>
                {editingField === 'details' ? (
                  <textarea
                    defaultValue={selectedNode.details || ''}
                    autoFocus
                    rows={4}
                    onBlur={(e) => handleFieldEdit('details', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                ) : (
                  <div
                    className="editable-value multiline"
                    onClick={() => setEditingField('details')}
                  >
                    {selectedNode.details || '(无)'}
                    <span className="edit-hint">点击编辑</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="detail-section">
                <label>标签</label>
                {editingField === 'tags' ? (
                  <input
                    type="text"
                    defaultValue={selectedNode.tags.join(', ')}
                    placeholder="用逗号分隔多个标签"
                    autoFocus
                    onBlur={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      handleFieldEdit('tags', tags);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const tags = e.currentTarget.value.split(',').map(t => t.trim()).filter(Boolean);
                        handleFieldEdit('tags', tags);
                      }
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                ) : (
                  <div
                    className="editable-value tags"
                    onClick={() => setEditingField('tags')}
                  >
                    {selectedNode.tags.length > 0 ? (
                      selectedNode.tags.map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                      ))
                    ) : (
                      <span className="empty">(无标签)</span>
                    )}
                    <span className="edit-hint">点击编辑</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="detail-section">
                <label>状态</label>
                <div className={`status-badge ${selectedNode.status}`}>
                  {selectedNode.status === 'active' ? '✅ 有效' : '🚫 已废弃'}
                </div>
              </div>

              {/* Canonical Key */}
              <div className="detail-section">
                <label>唯一标识</label>
                <code className="canonical-key">{selectedNode.canonicalKey}</code>
              </div>

              {/* Source Segments */}
              <div className="detail-section">
                <label>来源片段 ({sourceSegments.length})</label>
                <div className="source-segments">
                  {sourceSegments.length > 0 ? (
                    sourceSegments.map(seg => (
                      <div
                        key={seg.id}
                        className="source-segment"
                        onClick={() => handleNavigateToSegment(seg.id)}
                      >
                        <div className="segment-preview">
                          {seg.text.substring(0, 100)}...
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty">无关联片段</div>
                  )}
                </div>
              </div>

              {/* Relationships */}
              <div className="detail-section">
                <label>关系</label>
                <div className="relationships">
                  {connectedEdges.incoming.length > 0 && (
                    <div className="relationship-group">
                      <div className="group-title">被引用</div>
                      {connectedEdges.incoming.map(edge => (
                        <div
                          key={edge.id}
                          className="relationship-item"
                          onClick={() => edge.sourceNode && handleNavigateToNode(edge.sourceNode.id)}
                        >
                          <span className="relation-type">{relationTypeLabels[edge.relationType]}</span>
                          <span className="relation-node">← {edge.sourceNode?.title || '未知'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {connectedEdges.outgoing.length > 0 && (
                    <div className="relationship-group">
                      <div className="group-title">引用</div>
                      {connectedEdges.outgoing.map(edge => (
                        <div
                          key={edge.id}
                          className="relationship-item"
                          onClick={() => edge.targetNode && handleNavigateToNode(edge.targetNode.id)}
                        >
                          <span className="relation-type">{relationTypeLabels[edge.relationType]}</span>
                          <span className="relation-node">→ {edge.targetNode?.title || '未知'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {connectedEdges.incoming.length === 0 && connectedEdges.outgoing.length === 0 && (
                    <div className="empty">无关联关系</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <div className="icon">📝</div>
              <div className="text">选择一个节点查看详情</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deprecated' && (
        <div className="inspector-content">
          {deprecatedNodes.length > 0 ? (
            <div className="deprecated-list">
              {deprecatedNodes.map(node => (
                <div key={node.id} className="deprecated-item">
                  <div className="item-content">
                    <div className="item-title">{node.title}</div>
                    <div className="item-summary">{node.summary}</div>
                  </div>
                  <div className="item-actions">
                    <button
                      className="restore-btn"
                      onClick={() => handleRestoreNode(node.id)}
                      title="恢复"
                    >
                      ✅
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteNode(node.id)}
                      title="彻底删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-selection">
              <div className="icon">✨</div>
              <div className="text">没有废弃的节点</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
