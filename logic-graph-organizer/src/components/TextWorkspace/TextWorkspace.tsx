import { useState, useCallback, useRef, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useAppStore } from '../../stores/useAppStore';
import { parseTextToSegments } from '../../utils/segmentParser';
import type { Segment } from '../../types';
import './TextWorkspace.css';

interface SegmentCardProps {
  segment: Segment;
  isHighlighted: boolean;
  onToggleSelect: () => void;
  onEdit: (updates: Partial<Segment>) => void;
  onClick: () => void;
}

const SegmentCard = ({
  segment,
  isHighlighted,
  onToggleSelect,
  onEdit,
  onClick,
}: SegmentCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(segment.text);

  const handleSave = () => {
    onEdit({ text: editText });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(segment.text);
    setIsEditing(false);
  };

  return (
    <div
      className={`segment-card ${segment.selected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onClick}
    >
      <div className="segment-header">
        <input
          type="checkbox"
          checked={segment.selected || false}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="segment-meta">
          {segment.meta.version && (
            <span className="meta-badge version">v{segment.meta.version}</span>
          )}
          {segment.meta.source && (
            <span className="meta-badge source">{segment.meta.source}</span>
          )}
          {segment.meta.date && (
            <span className="meta-badge date">{segment.meta.date}</span>
          )}
        </div>
        <button
          className="edit-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(!isEditing);
          }}
          title={isEditing ? '取消' : '编辑'}
        >
          {isEditing ? '✕' : '✎'}
        </button>
      </div>

      {isEditing ? (
        <div className="segment-edit" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
          />
          <div className="edit-actions">
            <button onClick={handleSave} className="save-btn">保存</button>
            <button onClick={handleCancel} className="cancel-btn">取消</button>
          </div>
        </div>
      ) : (
        <div className="segment-text">{segment.text}</div>
      )}

      {segment.meta.tags && segment.meta.tags.length > 0 && (
        <div className="segment-tags">
          {segment.meta.tags.map((tag, idx) => (
            <span key={idx} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export const TextWorkspace = () => {
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const {
    segments,
    addSegments,
    updateSegment,
    toggleSegmentSelection,
    selectAllSegments,
    deselectAllSegments,
    clearSegments,
    ui,
    setHighlightedNodeIds,
    nodes,
  } = useAppStore();

  const highlightedSegmentIds = ui.highlightedSegmentIds;

  // Scroll to highlighted segment
  useEffect(() => {
    if (highlightedSegmentIds.length > 0 && virtuosoRef.current) {
      const index = segments.findIndex(s => highlightedSegmentIds.includes(s.id));
      if (index !== -1) {
        virtuosoRef.current.scrollToIndex({ index, behavior: 'smooth', align: 'center' });
      }
    }
  }, [highlightedSegmentIds, segments]);

  const handleSplitText = useCallback(() => {
    if (!inputText.trim()) return;

    const newSegments = parseTextToSegments(inputText);
    addSegments(newSegments);
    setInputText('');
    setShowInput(false);
  }, [inputText, addSegments]);

  const handleSegmentClick = useCallback((segment: Segment) => {
    // Find nodes that reference this segment
    const relatedNodeIds = nodes
      .filter(n => n.sourceSegmentIds.includes(segment.id))
      .map(n => n.id);

    setHighlightedNodeIds(relatedNodeIds);
  }, [nodes, setHighlightedNodeIds]);

  const selectedCount = segments.filter(s => s.selected).length;

  return (
    <div className="text-workspace">
      <div className="workspace-header">
        <h3>原文区</h3>
        <button
          className="toggle-input-btn"
          onClick={() => setShowInput(!showInput)}
        >
          {showInput ? '收起输入' : '展开输入'}
        </button>
      </div>

      {showInput && (
        <div className="input-section">
          <textarea
            className="text-input"
            placeholder="在此粘贴或输入需要整理的文本...&#10;&#10;支持 Markdown 格式，会自动识别标题、列表、段落等结构。"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
          />
          <div className="input-actions">
            <button
              className="split-btn primary"
              onClick={handleSplitText}
              disabled={!inputText.trim()}
            >
              切分片段
            </button>
            <span className="char-count">
              {inputText.length} 字符
            </span>
          </div>
        </div>
      )}

      <div className="segments-section">
        <div className="segments-toolbar">
          <span className="segment-count">
            {segments.length} 个片段 {selectedCount > 0 && `(已选 ${selectedCount})`}
          </span>
          <div className="segment-actions">
            <button onClick={selectAllSegments} disabled={segments.length === 0}>
              全选
            </button>
            <button onClick={deselectAllSegments} disabled={selectedCount === 0}>
              取消全选
            </button>
            <button
              onClick={clearSegments}
              disabled={segments.length === 0}
              className="danger"
            >
              清空
            </button>
          </div>
        </div>

        {segments.length === 0 ? (
          <div className="empty-segments">
            <p>暂无片段</p>
            <p className="hint">在上方输入文本并点击"切分片段"</p>
          </div>
        ) : (
          <div className="segments-list">
            <Virtuoso
              ref={virtuosoRef}
              style={{ height: '100%' }}
              data={segments}
              itemContent={(_index, segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  isHighlighted={highlightedSegmentIds.includes(segment.id)}
                  onToggleSelect={() => toggleSegmentSelection(segment.id)}
                  onEdit={(updates) => updateSegment(segment.id, updates)}
                  onClick={() => handleSegmentClick(segment)}
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
};
