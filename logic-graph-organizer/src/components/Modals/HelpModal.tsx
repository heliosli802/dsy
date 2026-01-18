import React from 'react';
import './Modals.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 使用帮助</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <section>
            <h3>🎯 这是什么？</h3>
            <p>
              <strong>业务逻辑整理器</strong>帮助你把散乱的业务文档、规则说明、需求笔记整理成清晰的知识图谱。
              特别适合整理多版本迭代后的文案，识别哪些内容已过期，哪些互相冲突。
            </p>
          </section>

          <section>
            <h3>🔄 工作流程</h3>
            <ol>
              <li>
                <strong>导入文本</strong>
                <p>在左侧输入框粘贴或导入你的业务文档（支持 .txt/.md 文件）</p>
              </li>
              <li>
                <strong>切分片段</strong>
                <p>点击"切分片段"，系统会按标题、段落、列表项自动拆分</p>
              </li>
              <li>
                <strong>AI 生成节点</strong>
                <p>选择要分析的片段（或全选），点击"AI 生成"，Gemini 会自动提取概念和关系</p>
              </li>
              <li>
                <strong>手动整理</strong>
                <p>在画布上拖拽节点调整布局，拖拽连线建立新关系，右键编辑</p>
              </li>
              <li>
                <strong>废弃旧内容</strong>
                <p>把过期节点拖到右下角垃圾箱，或右键标记废弃。可随时恢复。</p>
              </li>
              <li>
                <strong>导出成果</strong>
                <p>导出为 JSON（可再次导入）、Markdown 或 Mermaid 格式</p>
              </li>
            </ol>
          </section>

          <section>
            <h3>🖱️ 画布操作</h3>
            <ul>
              <li><strong>拖拽节点</strong> - 调整位置</li>
              <li><strong>从连接点拖拽</strong> - 创建新的关系连线</li>
              <li><strong>右键节点</strong> - 编辑、标记废弃、删除</li>
              <li><strong>右键连线</strong> - 修改关系类型、删除</li>
              <li><strong>滚轮</strong> - 缩放画布</li>
              <li><strong>拖拽空白处</strong> - 平移画布</li>
              <li><strong>拖到垃圾箱</strong> - 废弃节点</li>
            </ul>
          </section>

          <section>
            <h3>🔗 关系类型说明</h3>
            <ul>
              <li><strong>层级 (hierarchy)</strong> - 父子/包含关系，如"订单系统"包含"订单状态机"</li>
              <li><strong>依赖 (dependency)</strong> - A 依赖 B，如"退款规则"依赖"订单状态"</li>
              <li><strong>引用 (reference)</strong> - A 引用/提到 B</li>
              <li><strong>冲突 (conflict)</strong> - A 和 B 有矛盾/新旧版本冲突</li>
              <li><strong>其他 (other)</strong> - 其他自定义关系</li>
            </ul>
          </section>

          <section>
            <h3>🔑 API 配置</h3>
            <p>
              AI 功能需要 Gemini API Key。请前往{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                Google AI Studio
              </a>
              {' '}获取免费 API Key。
            </p>
            <p className="note">
              注意：API Key 仅保存在本地浏览器，不会上传到任何服务器。
            </p>
          </section>

          <section>
            <h3>💾 数据存储</h3>
            <p>
              所有数据自动保存在浏览器本地存储 (localStorage)，刷新页面不会丢失。
              如需跨设备同步，请使用"导出 JSON"/"导入 JSON"功能。
            </p>
          </section>

          <section>
            <h3>⌨️ 快捷键</h3>
            <ul>
              <li><strong>Ctrl/Cmd + Z</strong> - 撤销</li>
              <li><strong>Ctrl/Cmd + Y</strong> - 重做</li>
              <li><strong>Delete</strong> - 删除选中节点</li>
            </ul>
          </section>
        </div>

        <div className="modal-footer">
          <button className="primary" onClick={onClose}>我知道了</button>
        </div>
      </div>
    </div>
  );
};
