import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../stores/useAppStore';
import { geminiService } from '../../services/geminiService';
import './Modals.css';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const { ui, setApiKey } = useAppStore();
  const [inputKey, setInputKey] = useState(ui.apiKey);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setInputKey(ui.apiKey);
  }, [ui.apiKey, isOpen]);

  const handleSave = () => {
    const trimmedKey = inputKey.trim();
    setApiKey(trimmedKey);

    if (trimmedKey) {
      geminiService.setApiKey(trimmedKey);
      toast.success('API Key 已保存');
    } else {
      toast.success('API Key 已清除');
    }

    onClose();
  };

  const handleClear = () => {
    setInputKey('');
    setApiKey('');
    toast.success('API Key 已清除');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content api-key-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 配置 Gemini API Key</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="description">
            AI 功能需要 Google Gemini API Key。你可以免费获取：
          </p>

          <ol className="steps">
            <li>
              访问{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                Google AI Studio
              </a>
            </li>
            <li>使用 Google 账号登录</li>
            <li>点击"Create API Key"创建新的 Key</li>
            <li>复制 Key 并粘贴到下方</li>
          </ol>

          <div className="input-group">
            <label>API Key</label>
            <div className="key-input-wrapper">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="粘贴你的 Gemini API Key..."
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="security-note">
            <span className="icon">🔒</span>
            <span>
              API Key 仅保存在你的浏览器本地，不会上传到任何服务器。
              所有 AI 请求直接从你的浏览器发送到 Google。
            </span>
          </div>

          {ui.apiKey && (
            <div className="current-status">
              <span className="status-icon">✅</span>
              <span>当前已配置 API Key</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {ui.apiKey && (
            <button className="danger" onClick={handleClear}>
              清除 Key
            </button>
          )}
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
