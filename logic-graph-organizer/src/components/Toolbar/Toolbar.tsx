import { useState, useRef, useCallback, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../stores/useAppStore';
import { geminiService } from '../../services/geminiService';
import {
  exportToJSON,
  exportToMarkdown,
  exportToMermaid,
  exportToMermaidFlowchart,
  downloadAsFile,
  readFileAsText,
  importFromJSON,
} from '../../utils/exportUtils';
import { parseTextToSegments } from '../../utils/segmentParser';
import { sampleSegments, sampleNodes, sampleEdges } from '../../utils/sampleData';
import './Toolbar.css';

interface ToolbarProps {
  onShowHelp: () => void;
  onShowApiKeyModal: () => void;
}

export const Toolbar = ({ onShowHelp, onShowApiKeyModal }: ToolbarProps) => {
  const {
    segments,
    nodes,
    edges,
    ui,
    clearAll,
    importData,
    setSearchQuery,
    setShowDeprecated,
    undo,
    redo,
    canUndo,
    canRedo,
    addSegments,
    saveToHistory,
    mergeGeminiResponse,
    setNodes,
    setEdges,
  } = useAppStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);

  const selectedSegments = segments.filter(s => s.selected);

  // Handle AI extract
  const handleAIExtract = useCallback(async () => {
    if (!geminiService.isConfigured()) {
      onShowApiKeyModal();
      toast.error('请先配置 Gemini API Key');
      return;
    }

    const targetSegments = selectedSegments.length > 0 ? selectedSegments : segments;

    if (targetSegments.length === 0) {
      toast.error('请先添加文本片段');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('正在用 AI 分析文本...');

    try {
      saveToHistory();

      const response = await geminiService.extractGraphFromSegments(
        targetSegments,
        nodes,
        edges,
        (message) => toast.loading(message, { id: toastId })
      );

      mergeGeminiResponse(response, targetSegments.map(s => s.id));

      const warningCount = response.warnings?.length || 0;
      toast.success(
        `生成了 ${response.nodes.length} 个节点和 ${response.edges.length} 个关系` +
        (warningCount > 0 ? `，${warningCount} 条警告` : ''),
        { id: toastId }
      );

      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach(warning => {
          toast(warning, { icon: '⚠️', duration: 5000 });
        });
      }
    } catch (error) {
      console.error('AI extract error:', error);
      toast.error(error instanceof Error ? error.message : 'AI 分析失败', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedSegments, segments, nodes, edges, saveToHistory, mergeGeminiResponse, onShowApiKeyModal]);

  // Handle AI merge/refine
  const handleAIMerge = useCallback(async () => {
    if (!geminiService.isConfigured()) {
      onShowApiKeyModal();
      toast.error('请先配置 Gemini API Key');
      return;
    }

    if (nodes.length === 0) {
      toast.error('画布为空，请先生成节点');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('正在用 AI 优化图结构...');

    try {
      saveToHistory();

      const response = await geminiService.mergeAndRefineGraph(
        nodes,
        edges,
        (message) => toast.loading(message, { id: toastId })
      );

      // Apply merged graph
      const newNodes = response.nodes.map((n, idx) => ({
        id: nodes.find(existing => existing.canonicalKey === n.canonicalKey)?.id || `merged-${idx}`,
        ...n,
        position: nodes.find(existing => existing.canonicalKey === n.canonicalKey)?.position || {
          x: 100 + (idx % 5) * 250,
          y: 100 + Math.floor(idx / 5) * 150,
        },
      }));

      const keyToId = new Map(newNodes.map(n => [n.canonicalKey, n.id]));

      const newEdges = response.edges.map((e, idx) => ({
        id: `edge-merged-${idx}`,
        source: keyToId.get(e.sourceCanonicalKey) || '',
        target: keyToId.get(e.targetCanonicalKey) || '',
        relationType: e.relationType,
        label: e.label,
      })).filter(e => e.source && e.target);

      setNodes(newNodes);
      setEdges(newEdges);

      const mergedCount = Object.keys(response.mergedKeys || {}).length;
      toast.success(
        `优化完成：${newNodes.length} 个节点，${newEdges.length} 个关系` +
        (mergedCount > 0 ? `，合并了 ${mergedCount} 个重复节点` : ''),
        { id: toastId }
      );

      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach(warning => {
          toast(warning, { icon: '⚠️', duration: 5000 });
        });
      }
    } catch (error) {
      console.error('AI merge error:', error);
      toast.error(error instanceof Error ? error.message : 'AI 优化失败', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  }, [nodes, edges, saveToHistory, setNodes, setEdges, onShowApiKeyModal]);

  // Handle new/clear
  const handleClear = useCallback(() => {
    if (segments.length > 0 || nodes.length > 0) {
      if (window.confirm('确定要清空所有内容吗？此操作不可恢复。')) {
        clearAll();
        toast.success('已清空所有内容');
      }
    }
  }, [segments, nodes, clearAll]);

  // Handle load sample
  const handleLoadSample = useCallback(() => {
    saveToHistory();
    importData({
      segments: sampleSegments as any,
      nodes: sampleNodes as any,
      edges: sampleEdges as any,
    });
    toast.success('已加载示例数据');
  }, [saveToHistory, importData]);

  // Handle export JSON
  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(segments, nodes, edges);
    downloadAsFile(json, 'logic-graph-export.json', 'application/json');
    toast.success('已导出 JSON 文件');
    setShowExportMenu(false);
  }, [segments, nodes, edges]);

  // Handle export Markdown
  const handleExportMarkdown = useCallback(() => {
    const md = exportToMarkdown(nodes, edges, ui.showDeprecated);
    downloadAsFile(md, 'logic-graph-export.md', 'text/markdown');
    toast.success('已导出 Markdown 文件');
    setShowExportMenu(false);
  }, [nodes, edges, ui.showDeprecated]);

  // Handle export Mermaid
  const handleExportMermaid = useCallback(() => {
    const mermaid = exportToMermaid(nodes, edges, ui.showDeprecated);
    downloadAsFile(mermaid, 'logic-graph-mindmap.mmd', 'text/plain');
    toast.success('已导出 Mermaid 脑图');
    setShowExportMenu(false);
  }, [nodes, edges, ui.showDeprecated]);

  // Handle export Mermaid flowchart
  const handleExportMermaidFlowchart = useCallback(() => {
    const mermaid = exportToMermaidFlowchart(nodes, edges, ui.showDeprecated);
    downloadAsFile(mermaid, 'logic-graph-flowchart.mmd', 'text/plain');
    toast.success('已导出 Mermaid 流程图');
    setShowExportMenu(false);
  }, [nodes, edges, ui.showDeprecated]);

  // Handle import JSON
  const handleImportJSON = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const data = importFromJSON(content);
      saveToHistory();
      importData(data);
      toast.success(`已导入 ${data.segments.length} 个片段，${data.nodes.length} 个节点`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : '导入失败');
    }

    // Reset input
    e.target.value = '';
  }, [saveToHistory, importData]);

  // Handle import text file
  const handleImportText = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const newSegments = parseTextToSegments(content);
      saveToHistory();
      addSegments(newSegments);
      toast.success(`已导入并切分为 ${newSegments.length} 个片段`);
    } catch (error) {
      console.error('Import text error:', error);
      toast.error(error instanceof Error ? error.message : '导入失败');
    }

    // Reset input
    e.target.value = '';
  }, [saveToHistory, addSegments]);

  return (
    <div className="toolbar">
      <div className="toolbar-section logo">
        <span className="logo-text">📊 业务逻辑整理器</span>
        <span className="logo-subtext">LogicGraph Organizer</span>
      </div>

      <div className="toolbar-section">
        <button onClick={handleClear} title="新建/清空">
          <span className="btn-icon">📄</span>
          <span className="btn-text">新建</span>
        </button>
        <button onClick={handleLoadSample} title="加载示例">
          <span className="btn-icon">📥</span>
          <span className="btn-text">示例</span>
        </button>
        <button onClick={() => textFileInputRef.current?.click()} title="导入文本">
          <span className="btn-icon">📝</span>
          <span className="btn-text">导入文本</span>
        </button>
        <input
          ref={textFileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={handleImportText}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()} title="导入JSON">
          <span className="btn-icon">📂</span>
          <span className="btn-text">导入JSON</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          style={{ display: 'none' }}
        />
      </div>

      <div className="toolbar-section">
        <div className="dropdown">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={nodes.length === 0}
            title="导出"
          >
            <span className="btn-icon">💾</span>
            <span className="btn-text">导出</span>
            <span className="dropdown-arrow">▾</span>
          </button>
          {showExportMenu && (
            <>
              <div className="dropdown-overlay" onClick={() => setShowExportMenu(false)} />
              <div className="dropdown-menu">
                <button onClick={handleExportJSON}>导出 JSON</button>
                <button onClick={handleExportMarkdown}>导出 Markdown</button>
                <button onClick={handleExportMermaid}>导出 Mermaid 脑图</button>
                <button onClick={handleExportMermaidFlowchart}>导出 Mermaid 流程图</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="toolbar-section">
        <button
          onClick={undo}
          disabled={!canUndo()}
          title="撤销 (Ctrl+Z)"
        >
          <span className="btn-icon">↩️</span>
          <span className="btn-text">撤销</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          title="重做 (Ctrl+Y)"
        >
          <span className="btn-icon">↪️</span>
          <span className="btn-text">重做</span>
        </button>
      </div>

      <div className="toolbar-section ai-section">
        <button
          className="ai-btn primary"
          onClick={handleAIExtract}
          disabled={isProcessing || segments.length === 0}
          title="用 AI 生成节点和关系"
        >
          <span className="btn-icon">✨</span>
          <span className="btn-text">
            AI 生成
            {selectedSegments.length > 0 && ` (${selectedSegments.length})`}
          </span>
        </button>
        <button
          className="ai-btn secondary"
          onClick={handleAIMerge}
          disabled={isProcessing || nodes.length === 0}
          title="用 AI 合并去重和优化"
        >
          <span className="btn-icon">🔧</span>
          <span className="btn-text">AI 优化</span>
        </button>
      </div>

      <div className="toolbar-section search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索节点..."
            value={ui.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {ui.searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="toolbar-section">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={ui.showDeprecated}
            onChange={(e) => setShowDeprecated(e.target.checked)}
          />
          <span>显示废弃</span>
        </label>
      </div>

      <div className="toolbar-section">
        <button onClick={onShowApiKeyModal} title="API 设置">
          <span className="btn-icon">🔑</span>
          <span className="btn-text">API</span>
        </button>
        <button onClick={onShowHelp} title="使用帮助">
          <span className="btn-icon">❓</span>
          <span className="btn-text">帮助</span>
        </button>
      </div>
    </div>
  );
};
