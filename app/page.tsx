'use client';

import { useState, useEffect } from 'react';
import ConfigPanel from './components/ConfigPanel';
import ResultsPanel from './components/ResultsPanel';
import SummaryPanel from './components/SummaryPanel';
import SettingsModal from './components/SettingsModal';
import StreamLogsPanel from './components/StreamLogsPanel';
import type { SearchResultCallback, EvaluationResult, EvaluationProgress } from './services/evaluationService';
import type { SSEMessageCallback } from './types';

/**
 * 搜索引擎评测工具主页面
 * 提供左侧配置面板和右侧结果展示的双栏布局
 */
export default function Home() {
  // 搜索引擎配置状态
  const [searchEngines, setSearchEngines] = useState([
    { id: 1, code: 'search_std', name: '智谱基础版搜索引擎' },
    // { id: 2, code: 'search_pro', name: '智谱高阶版搜索引擎' },
    { id: 3, code: 'search_pro_sogou', name: '搜狗' },
    // { id: 4, code: 'search_pro_quark', name: '夸克搜索' },
  ]);

  // 评测维度配置
  const [dimensions, setDimensions] = useState([
    { id: 1, name: '权威性', weight: 0.4, enabled: true },
    { id: 2, name: '相关性', weight: 0.35, enabled: true },
    { id: 3, name: '时效性', weight: 0.25, enabled: true },
  ]);

  // 评测结果状态
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // 搜索结果状态（用于即时显示）
  const [searchResults, setSearchResults] = useState<SearchResultCallback[]>([]);
  
  // SSE消息状态（用于流式日志显示）
  const [sseMessages, setSseMessages] = useState<{message: string, timestamp: string, dimension?: string, engine?: string, query?: string}[]>([]);
  
  // 评测进度状态
  const [evaluationProgress, setEvaluationProgress] = useState<EvaluationProgress | null>(null);
  
  /**
   * 处理搜索结果即时回调
   */
  const handleSearchResult = (searchResult: SearchResultCallback) => {
    setSearchResults(prev => {
      // 避免重复添加相同的搜索结果
      const exists = prev.some(result => 
        result.engineId === searchResult.engineId && 
        result.query === searchResult.query
      );
      if (exists) {
        return prev;
      }
      return [...prev, searchResult];
    });
  };
  
  /**
 * 处理SSE消息回调
 */
const handleSseMessage: SSEMessageCallback = (message, metadata) => {
  setSseMessages(prev => [...prev, {
    message,
    timestamp: new Date().toISOString(),
    dimension: metadata?.dimension,
    engine: metadata?.engine,
    query: metadata?.query
  }]);
};
  
  /**
   * 处理评测进度回调
   */
  const handleEvaluationProgress = (progress: EvaluationProgress) => {
    setEvaluationProgress(progress);
  };
  
  /**
   * 清空搜索结果和SSE消息（开始新评测时）
   */
  const clearResults = () => {
    setSearchResults([]);
    setSseMessages([]);
    setEvaluationProgress(null);
  };
  
  // 设置弹窗状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // API配置状态（从SettingsModal提升到主页面）
  const [apiConfig, setApiConfig] = useState({
    // 搜索引擎配置
    websearchUrl: 'https://open.bigmodel.cn/api/paas/v4/web_search',
    // 评分模型配置
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: '',
    modelKey: 'glm-4-plus'
  });
  
  // 汇总面板折叠状态
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(true);
  
  // 汇总面板高度状态
  const [summaryHeight, setSummaryHeight] = useState(320); // 默认高度 320px (h-80)
  const [isResizing, setIsResizing] = useState(false);
  
  // 评测轮数状态
  const [evaluationRounds, setEvaluationRounds] = useState(3);
  
  // 当有评测结果时自动展开汇总面板
  useEffect(() => {
    if (evaluationResults.length > 0 && isSummaryCollapsed) {
      setIsSummaryCollapsed(false);
    }
  }, [evaluationResults.length, isSummaryCollapsed]);

  // 处理汇总面板高度调整
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // 计算新高度（从底部向上拖动）
      const viewportHeight = window.innerHeight;
      const newHeight = viewportHeight - e.clientY;
      
      // 限制最小和最大高度
      const minHeight = 200; // 最小高度
      const maxHeight = viewportHeight * 0.8; // 最大高度为视口的80%
      
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setSummaryHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Z.Eval</h1>
            <p className="text-sm text-gray-600 mt-1">多维度评估搜索引擎结果质量</p>
          </div>
          <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
           </button>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* 左侧配置面板 */}
        <div className="w-full lg:w-1/4 xl:w-1/5 bg-white border-r border-gray-200 overflow-y-auto max-h-[50vh] lg:max-h-none">
          <ConfigPanel
            dimensions={dimensions}
            setDimensions={setDimensions}
            isEvaluating={isEvaluating}
            setIsEvaluating={setIsEvaluating}
            setEvaluationResults={setEvaluationResults}
            searchEngines={searchEngines}
            apiConfig={apiConfig}
            onEvaluationRoundsChange={setEvaluationRounds}
            onSearchResult={handleSearchResult}
            onSseMessage={handleSseMessage}
            onEvaluationProgress={handleEvaluationProgress}
            clearResults={clearResults}
          />
        </div>

        {/* 中间流式日志区域 */}
        <div className="w-full lg:w-2/5 xl:w-2/5 bg-white border-r border-gray-200 overflow-y-auto max-h-[50vh] lg:max-h-none">
          <div className="p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">流式日志</h2>
              <p className="text-sm text-gray-600">
                实时显示API调用和SSE流式响应
              </p>
            </div>
            <StreamLogsPanel
              searchResults={searchResults}
              sseMessages={sseMessages}
              isEvaluating={isEvaluating}
            />
          </div>
        </div>

        {/* 右侧结果区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 搜索结果展示面板 */}
          <div className="flex-1 overflow-y-auto">
            <ResultsPanel
              searchEngines={searchEngines}
              dimensions={dimensions.filter(dim => dim.enabled)}
              evaluationResults={evaluationResults}
              isEvaluating={isEvaluating}
              totalRounds={evaluationRounds}
              searchResults={searchResults}
              evaluationProgress={evaluationProgress}
            />
          </div>

          {/* 底部汇总面板 */}
          <div 
            className="border-t border-gray-200 bg-white transition-all duration-300"
            style={{
              height: isSummaryCollapsed ? '48px' : `${summaryHeight}px`
            }}
          >
            {/* 拖动调整手柄 */}
            {!isSummaryCollapsed && (
              <div 
                className="h-1 bg-gray-300 hover:bg-blue-400 cursor-ns-resize transition-colors duration-200 relative group"
                onMouseDown={handleResizeStart}
              >
                <div className="absolute inset-x-0 -top-1 -bottom-1 flex items-center justify-center">
                  <div className="w-8 h-1 bg-gray-400 rounded-full group-hover:bg-blue-500 transition-colors duration-200"></div>
                </div>
              </div>
            )}
            
            {/* 折叠/展开控制栏 */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">汇总统计</h2>
              <button
                onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                disabled={evaluationResults.length === 0}
                className={`p-1 rounded-md transition-colors ${
                  evaluationResults.length === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <svg 
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isSummaryCollapsed ? 'rotate-0' : 'rotate-180'
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
            
            {/* 汇总内容区域 */}
            {!isSummaryCollapsed && (
              <div className="h-[calc(100%-52px)] overflow-y-auto overflow-x-hidden">
                <SummaryPanel
                  searchEngines={searchEngines}
                  dimensions={dimensions.filter(dim => dim.enabled)}
                  evaluationResults={evaluationResults}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 设置弹窗 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        searchEngines={searchEngines}
        setSearchEngines={setSearchEngines}
        apiConfig={apiConfig}
        setApiConfig={setApiConfig}
      />
    </div>
  );
}
