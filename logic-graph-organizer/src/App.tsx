import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { Toolbar } from './components/Toolbar';
import { TextWorkspace } from './components/TextWorkspace';
import { GraphCanvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { HelpModal, ApiKeyModal } from './components/Modals';
import { useAppStore } from './stores/useAppStore';
import { geminiService } from './services/geminiService';
import './App.css';

function App() {
  const [showHelp, setShowHelp] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const { ui, undo, redo, canUndo, canRedo, saveToHistory, deleteNode } = useAppStore();

  // Initialize API key from store
  useEffect(() => {
    if (ui.apiKey) {
      geminiService.setApiKey(ui.apiKey);
    }

    // Check if first visit
    const hasVisited = localStorage.getItem('logic-graph-has-visited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      setShowHelp(true);
      localStorage.setItem('logic-graph-has-visited', 'true');
    }
  }, [ui.apiKey]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Delete: Delete selected node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (ui.selectedNodeId) {
          e.preventDefault();
          saveToHistory();
          deleteNode(ui.selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, ui.selectedNodeId, saveToHistory, deleteNode]);

  // Resizable panels
  const [leftWidth, setLeftWidth] = useState(ui.leftPanelWidth);
  const [rightWidth, setRightWidth] = useState(ui.rightPanelWidth);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(250, Math.min(500, e.clientX));
        setLeftWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(250, Math.min(400, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    },
    [isResizingLeft, isResizingRight]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingLeft, isResizingRight, handleMouseMove, handleMouseUp]);

  return (
    <div className="app">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            fontSize: '14px',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Toolbar
        onShowHelp={() => setShowHelp(true)}
        onShowApiKeyModal={() => setShowApiKey(true)}
      />

      <div className="app-content">
        <div
          className="panel left-panel"
          style={{ width: leftWidth }}
        >
          <TextWorkspace />
        </div>

        <div
          className="resizer left-resizer"
          onMouseDown={() => setIsResizingLeft(true)}
        />

        <div className="panel center-panel">
          <GraphCanvas />
        </div>

        <div
          className="resizer right-resizer"
          onMouseDown={() => setIsResizingRight(true)}
        />

        <div
          className="panel right-panel"
          style={{ width: rightWidth }}
        >
          <Inspector />
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <ApiKeyModal isOpen={showApiKey} onClose={() => setShowApiKey(false)} />

      {/* First visit overlay */}
      {isFirstVisit && !showHelp && (
        <div className="first-visit-tip" onClick={() => setIsFirstVisit(false)}>
          <div className="tip-content">
            <span>👋</span>
            <span>点击顶部"示例"按钮加载示例数据体验功能</span>
            <button onClick={() => setIsFirstVisit(false)}>知道了</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
