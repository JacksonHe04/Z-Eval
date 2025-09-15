'use client';

import { useState } from 'react';

interface SearchEngine {
  id: number;
  code: string;
  name: string;
}

interface Dimension {
  id: number;
  name: string;
  weight: number;
  enabled: boolean;
}

interface EvaluationResult {
  engineId: number;
  engineName: string;
  query: string;
  round: number;
  searchResults: SearchResult[];
  scores: Record<string, number>;
  weightedScore: number;
  timestamp: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  rank: number;
}

interface SearchResultCallback {
  engineId: number;
  engineName: string;
  query: string;
  searchResults: SearchResult[];
  timestamp: string;
}

interface ResultsPanelProps {
  searchEngines: SearchEngine[];
  dimensions: Dimension[];
  evaluationResults: EvaluationResult[];
  isEvaluating: boolean;
  totalRounds?: number;
  searchResults?: SearchResultCallback[];
}

/**
 * 结果展示面板组件
 * 支持即时显示搜索结果和评测结果
 */
export default function ResultsPanel({
  searchEngines,
  dimensions,
  evaluationResults,
  isEvaluating,
  totalRounds = 1,
  searchResults = []
}: ResultsPanelProps) {
  // 控制各搜索引擎面板的展开/折叠状态
  const [expandedEngines, setExpandedEngines] = useState<Record<number, boolean>>(
    searchEngines.reduce((acc, engine) => ({ ...acc, [engine.id]: true }), {})
  );

  // 控制各评测结果详情的展开/折叠状态
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  /**
   * 切换搜索引擎面板的展开/折叠状态
   */
  const toggleEnginePanel = (engineId: number) => {
    setExpandedEngines(prev => ({
      ...prev,
      [engineId]: !prev[engineId]
    }));
  };

  /**
   * 切换评测结果详情的展开/折叠状态
   */
  const toggleResultDetails = (key: string) => {
    setExpandedResults(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  /**
   * 获取指定搜索引擎的评测结果
   */
  const getEngineResults = (engineId: number) => {
    return evaluationResults.filter(result => result.engineId === engineId);
  };

  /**
   * 获取指定搜索引擎的搜索结果
   */
  const getEngineSearchResults = (engineId: number) => {
    return searchResults.filter(result => result.engineId === engineId);
  };

  /**
   * 检查搜索引擎是否有搜索结果
   */
  const hasSearchResults = (engineId: number) => {
    return getEngineSearchResults(engineId).length > 0;
  };

  /**
   * 计算搜索引擎的平均分数
   */
  const calculateAverageScore = (engineId: number) => {
    const results = getEngineResults(engineId);
    if (results.length === 0) return '0.0';
    const average = results.reduce((sum, result) => sum + result.weightedScore, 0) / results.length;
    return average.toFixed(1);
  };

  /**
   * 获取评测进度
   */
  const getEvaluationProgress = (engineId: number) => {
    const completed = getEngineResults(engineId).length;
    return `${completed}/${totalRounds}`;
  };

  /**
   * 渲染搜索结果
   */
  const renderSearchResult = (result: SearchResult, index: number) => (
    <div key={index} className="border-l-2 border-gray-200 pl-2 sm:pl-3 mb-2 sm:mb-3">
      <div className="flex items-start space-x-2">
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 sm:px-2 py-1 rounded flex-shrink-0">
          #{result.rank}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 break-words">
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              {result.title}
            </a>
          </h4>
          <p className="text-xs text-gray-500 mt-1 break-all">{result.url}</p>
          <p className="text-xs sm:text-sm text-gray-700 mt-1 line-clamp-2">{result.snippet}</p>
        </div>
      </div>
    </div>
  );

  /**
   * 渲染即时搜索结果
   */
  const renderInstantSearchResults = (engineId: number) => {
    const engineSearchResults = getEngineSearchResults(engineId);
    if (engineSearchResults.length === 0) return null;

    return (
      <div className="mb-4">
        {engineSearchResults.map((searchResult, index) => (
          <div key={index} className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-blue-800">
                  搜索结果 - {searchResult.query}
                </h4>
                <span className="text-xs text-blue-600">
                  {new Date(searchResult.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="space-y-3">
                {searchResult.searchResults.map((result, resultIndex) => 
                  renderSearchResult(result, resultIndex)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * 渲染评分详情
   */
  const renderScoreDetails = (scores: Record<string, number>, dimensions: Dimension[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
      {dimensions.map(dim => (
        <div key={dim.id} className="text-center">
          <div className="text-xs text-gray-500 truncate">{dim.name}</div>
          <div className="text-xs sm:text-sm font-medium">
            {scores[dim.name] || 0}
            <span className="text-xs text-gray-400 ml-1">({(dim.weight * 100).toFixed(0)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );

  if (searchEngines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-lg mb-2">🔍</div>
          <p>请在左侧配置面板中选择搜索引擎</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">评测结果</h2>
        <p className="text-sm text-gray-600">
          实时显示各搜索引擎的搜索结果和评分详情
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {searchEngines.map(engine => {
          const engineResults = getEngineResults(engine.id);
          const isExpanded = expandedEngines[engine.id];
          const averageScore = calculateAverageScore(engine.id);
          const progress = getEvaluationProgress(engine.id);

          return (
            <div key={engine.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* 搜索引擎面板头部 */}
              <div 
                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleEnginePanel(engine.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-base sm:text-lg font-medium text-gray-900">{engine.name}</span>
                    {isEvaluating && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                    <span>进度: {progress}</span>
                    <span>平均分: {averageScore}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {engineResults.length > 0 && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                      {engineResults.length} 轮完成
                    </span>
                  )}
                  <svg 
                    className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* 搜索引擎面板内容 */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="p-3 sm:p-4">
                    {/* 即时搜索结果 */}
                    {renderInstantSearchResults(engine.id)}
                    
                    {/* 评测结果 */}
                    {engineResults.length === 0 && !hasSearchResults(engine.id) ? (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-3xl sm:text-4xl mb-2">⏳</div>
                        <p className="text-sm sm:text-base">等待评测开始...</p>
                      </div>
                    ) : engineResults.length > 0 && (
                      <div className="space-y-3 sm:space-y-4">
                        {engineResults.map((result, index) => {
                          const resultKey = `${engine.id}-${result.round}-${index}`;
                          const isResultExpanded = expandedResults[resultKey];

                          return (
                            <div key={resultKey} className="bg-gray-50 border border-gray-200 rounded-lg">
                              {/* 评测轮次头部 */}
                              <div 
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => toggleResultDetails(resultKey)}
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                    第 {result.round} 轮
                                  </span>
                                  <span className="text-sm text-gray-700 truncate max-w-xs">
                                    {result.query}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-green-600">
                                    {result.weightedScore.toFixed(1)}
                                  </span>
                                  <svg 
                                    className={`w-4 h-4 transform transition-transform ${isResultExpanded ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>

                              {/* 评测详情内容 */}
                              {isResultExpanded && (
                                <div className="border-t border-gray-200 p-3">
                                  {/* 评分详情 */}
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">评分详情</h4>
                                    {renderScoreDetails(result.scores, dimensions)}
                                  </div>

                                  {/* 搜索结果 */}
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                                      搜索结果 ({result.searchResults.length} 条)
                                    </h4>
                                    <div className="space-y-2">
                                      {result.searchResults.map((searchResult, idx) => 
                                        renderSearchResult(searchResult, idx)
                                      )}
                                    </div>
                                  </div>

                                  {/* 时间戳 */}
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500">
                                      评测时间: {new Date(result.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 评测状态提示 */}
      {isEvaluating && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>评测进行中...</span>
          </div>
        </div>
      )}
    </div>
  );
}