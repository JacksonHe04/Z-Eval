'use client';

import { useState, useMemo } from 'react';

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

// 定义搜索结果类型
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  rank: number;
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

interface SummaryPanelProps {
  searchEngines: SearchEngine[];
  dimensions: Dimension[];
  evaluationResults: EvaluationResult[];
}

interface EngineStats {
  engineId: number;
  engineName: string;
  averageScore: number;
  totalRounds: number;
  dimensionScores: Record<string, number>;
  scoreHistory: number[];
}

// 定义标签页类型
type TabKey = 'overview' | 'trends' | 'dimensions';

/**
 * 底部汇总展示面板组件
 * 显示所有搜索引擎的分数对比、趋势分析和统计信息
 */
export default function SummaryPanel({
  searchEngines,
  dimensions,
  evaluationResults
}: SummaryPanelProps) {
  // 当前活动标签页
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  /**
   * 计算各搜索引擎的统计数据
   */
  const engineStats = useMemo((): EngineStats[] => {
    return searchEngines.map(engine => {
      const engineResults = evaluationResults.filter(result => result.engineId === engine.id);
      
      const averageScore = engineResults.length > 0 
        ? engineResults.reduce((sum, result) => sum + result.weightedScore, 0) / engineResults.length
        : 0;

      const dimensionScores = dimensions.reduce((acc, dim) => {
        const dimScores = engineResults.map(result => result.scores[dim.name] || 0);
        const avgDimScore = dimScores.length > 0 
          ? dimScores.reduce((sum, score) => sum + score, 0) / dimScores.length
          : 0;
        return { ...acc, [dim.name]: avgDimScore };
      }, {} as Record<string, number>);

      const scoreHistory = engineResults
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(result => result.weightedScore);

      return {
        engineId: engine.id,
        engineName: engine.name,
        averageScore,
        totalRounds: engineResults.length,
        dimensionScores,
        scoreHistory
      };
    });
  }, [searchEngines, dimensions, evaluationResults]);

  /**
   * 获取排名最高的搜索引擎
   */
  const topEngine = useMemo(() => {
    return engineStats.reduce((top, current) => 
      current.averageScore > top.averageScore ? current : top
    , engineStats[0] || null);
  }, [engineStats]);

  /**
   * 计算总体统计信息
   */
  const overallStats = useMemo(() => {
    const totalEvaluations = evaluationResults.length;
    const avgScore = engineStats.length > 0 
      ? engineStats.reduce((sum, stat) => sum + stat.averageScore, 0) / engineStats.length
      : 0;
    
    const uniqueQueries = new Set(evaluationResults.map(result => result.query)).size;
    
    return {
      totalEvaluations,
      avgScore,
      uniqueQueries,
      activeEngines: searchEngines.length
    };
  }, [evaluationResults, engineStats, searchEngines]);

  /**
   * 渲染分数条形图
   */
  const renderScoreBar = (score: number, maxScore: number = 5) => {
    const percentage = (score / maxScore) * 100;
    const colorClass = percentage >= 80 ? 'bg-green-500' : 
                      percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    );
  };

  /**
   * 渲染简化的趋势图
   */
  const renderTrendChart = (scoreHistory: number[]) => {
    if (scoreHistory.length < 2) {
      return <div className="text-xs text-gray-400">数据不足</div>;
    }

    const maxScore = Math.max(...scoreHistory);
    const minScore = Math.min(...scoreHistory);
    const range = maxScore - minScore || 1;

    return (
      <div className="flex items-end space-x-1 h-8">
        {scoreHistory.map((score, index) => {
          const height = ((score - minScore) / range) * 100;
          return (
            <div
              key={index}
              className="bg-blue-400 w-2 rounded-t"
              style={{ height: `${Math.max(height, 10)}%` }}
              title={`第${index + 1}轮: ${score.toFixed(2)}`}
            ></div>
          );
        })}
      </div>
    );
  };

  if (evaluationResults.length === 0) {
    return (
      <div className="p-3 sm:p-6">
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <p>开始评测后，这里将显示汇总统计信息</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 标签页导航 */}
      <div className="flex space-x-1 mb-4 sm:mb-6 overflow-x-auto">
        {[
          { key: 'overview', label: '总览' },
          { key: 'trends', label: '趋势分析' },
          { key: 'dimensions', label: '维度分析' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 总览标签页 */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* 总体统计卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{overallStats.totalEvaluations}</div>
              <div className="text-xs sm:text-sm text-blue-600">总评测次数</div>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{overallStats.avgScore.toFixed(2)}</div>
              <div className="text-xs sm:text-sm text-green-600">平均分数</div>
            </div>
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{overallStats.uniqueQueries}</div>
              <div className="text-xs sm:text-sm text-purple-600">查询数量</div>
            </div>
            <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{overallStats.activeEngines}</div>
              <div className="text-xs sm:text-sm text-orange-600">活跃引擎</div>
            </div>
          </div>

          {/* 搜索引擎排名 */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">搜索引擎排名</h3>
            <div className="space-y-2 sm:space-y-3">
              {engineStats
                .sort((a, b) => b.averageScore - a.averageScore)
                .map((stat, index) => (
                  <div key={stat.engineId} className="flex items-center space-x-3 sm:space-x-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full font-bold text-xs sm:text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm sm:text-base">{stat.engineName}</span>
                        <span className="text-xs sm:text-sm text-gray-600">
                          {stat.averageScore.toFixed(2)} 分 ({stat.totalRounds} 轮)
                        </span>
                      </div>
                      {renderScoreBar(stat.averageScore)}
                    </div>
                    {index === 0 && (
                      <div className="text-yellow-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* 趋势分析标签页 */}
      {activeTab === 'trends' && (
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">分数趋势分析</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {engineStats.map(stat => (
              <div key={stat.engineId} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">{stat.engineName}</h4>
                  <span className="text-xs sm:text-sm text-gray-600">
                    平均: {stat.averageScore.toFixed(2)}
                  </span>
                </div>
                {renderTrendChart(stat.scoreHistory)}
                <div className="mt-2 text-xs text-gray-500">
                  {stat.scoreHistory.length} 轮评测数据
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 维度分析标签页 */}
      {activeTab === 'dimensions' && (
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">维度分析</h3>
          {dimensions.map(dimension => (
            <div key={dimension.id} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">{dimension.name}</h4>
                <span className="text-xs sm:text-sm text-gray-600">
                  权重: {(dimension.weight * 100).toFixed(0)}%
                </span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {engineStats.map(stat => (
                  <div key={stat.engineId} className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-16 sm:w-20 text-xs sm:text-sm text-gray-600 truncate">{stat.engineName}</div>
                    <div className="flex-1">
                      {renderScoreBar(stat.dimensionScores[dimension.name] || 0)}
                    </div>
                    <div className="w-10 sm:w-12 text-xs sm:text-sm text-gray-900 text-right">
                      {(stat.dimensionScores[dimension.name] || 0).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}