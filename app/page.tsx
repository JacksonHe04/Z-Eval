'use client';

import { useState, useEffect } from 'react';
import ConfigPanel from './components/ConfigPanel';
import ResultsPanel from './components/ResultsPanel';
import SummaryPanel from './components/SummaryPanel';
import SettingsModal from './components/SettingsModal';
import type { SearchResultCallback } from './services/evaluationService';

/**
 * 搜索引擎评测工具主页面
 * 提供左侧配置面板和右侧结果展示的双栏布局
 */
export default function Home() {
  // 搜索引擎配置状态
  const [searchEngines, setSearchEngines] = useState([
    { id: 1, code: 'search_std', name: '智谱基础版搜索引擎' },
    { id: 2, code: 'search_pro', name: '智谱高阶版搜索引擎' },
    { id: 3, code: 'search_pro_sogou', name: '搜狗' },
    { id: 4, code: 'search_pro_quark', name: '夸克搜索' },
  ]);

  // 评测维度配置
  const [dimensions, setDimensions] = useState([
    { id: 1, name: '权威性', weight: 0.4, enabled: true },
    { id: 2, name: '相关性', weight: 0.35, enabled: true },
    { id: 3, name: '时效性', weight: 0.25, enabled: true },
  ]);

  // 评测结果状态
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // 搜索结果状态（用于即时显示）
  const [searchResults, setSearchResults] = useState<SearchResultCallback[]>([]);
  
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
   * 清空搜索结果（开始新评测时）
   */
  const clearSearchResults = () => {
    setSearchResults([]);
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
    modelKey: 'glm-4.5'
  });
  
  // 汇总面板折叠状态
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(true);
  
  // 评测轮数状态
  const [evaluationRounds, setEvaluationRounds] = useState(3);
  
  // 当有评测结果时自动展开汇总面板
  useEffect(() => {
    if (evaluationResults.length > 0 && isSummaryCollapsed) {
      setIsSummaryCollapsed(false);
    }
  }, [evaluationResults.length, isSummaryCollapsed]);

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
        <div className="w-full lg:w-1/3 xl:w-1/4 bg-white border-r border-gray-200 overflow-y-auto max-h-[50vh] lg:max-h-none">
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
          />
        </div>

        {/* 右侧内容区域 */}
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
            />
          </div>

          {/* 底部汇总面板 */}
          <div className={`border-t border-gray-200 bg-white transition-all duration-300 ${
            isSummaryCollapsed ? 'h-12' : 'h-60 sm:h-72 lg:h-80'
          }`}>
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
              <div className="h-[calc(100%-48px)] overflow-hidden">
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
