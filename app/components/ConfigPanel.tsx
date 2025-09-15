'use client';

import { useState, useEffect } from 'react';
import PromptEditor from './PromptEditor';
import { 
  runOptimizedSingleEvaluation, 
  runOptimizedBatchEvaluation, 
  parseBatchQueries,
  validateEvaluationConfig,
  type EvaluationConfig,
  type EvaluationProgress,
  type EvaluationResult,
  type SearchResultCallback
} from '../services/evaluationService';

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

interface ApiConfig {
  websearchUrl: string;
  apiUrl: string;
  apiKey: string;
  modelKey: string;
}

interface ConfigPanelProps {
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  isEvaluating: boolean;
  setIsEvaluating: (evaluating: boolean) => void;
  setEvaluationResults: (results: EvaluationResult[]) => void;
  searchEngines: SearchEngine[];
  apiConfig: ApiConfig;
  onEvaluationRoundsChange?: (rounds: number) => void;
  onSearchResult?: (searchResult: SearchResultCallback) => void;
  onSseMessage?: (message: string, metadata?: {dimension?: string, engine?: string, query?: string}) => void;
  onEvaluationProgress?: (progress: EvaluationProgress) => void;
  clearResults?: () => void;
}

/**
 * 左侧配置面板组件
 * 包含API配置、查询输入、系统设置和提示词编辑功能
 */
export default function ConfigPanel({
  dimensions,
  setDimensions,
  isEvaluating,
  setIsEvaluating,
  setEvaluationResults,
  searchEngines,
  apiConfig,
  onEvaluationRoundsChange,
  onSearchResult,
  onSseMessage,
  onEvaluationProgress,
  clearResults
}: ConfigPanelProps) {
  // 查询配置状态
  const [queryConfig, setQueryConfig] = useState<{
    singleQuery: string;
    batchQueries: string;
    evaluationRounds: number;
    scoringSystem: 'binary' | 'fivePoint';
  }>({
    singleQuery: '',
    batchQueries: '',
    evaluationRounds: 3,
    scoringSystem: 'binary'
  });

  // 将传入的apiConfig转换为EvaluationConfig格式
  const evaluationConfig: EvaluationConfig = {
    apiUrl: apiConfig.apiUrl,
    modelApiKey: apiConfig.apiKey,
    modelKey: apiConfig.modelKey,
    websearchUrl: apiConfig.websearchUrl,
    scoringSystem: queryConfig.scoringSystem
  };

  const [errorMessage, setErrorMessage] = useState<string>('');

  // 提示词模板状态
  const [promptTemplates, setPromptTemplates] = useState({
    binary: {
      '权威性': '请评估搜索结果的权威性（0-2分）：\n0分：来源不可靠或无权威性\n1分：来源一般可靠\n2分：来源高度权威可靠',
      '相关性': '请评估搜索结果的相关性（0-2分）：\n0分：与查询完全不相关\n1分：部分相关\n2分：高度相关',
      '时效性': '请评估搜索结果的时效性（0-2分）：\n0分：信息过时\n1分：信息较新\n2分：信息最新'
    } as Record<string, string>,
    fivePoint: {
      '权威性': '请评估搜索结果的权威性（1-5分）：\n1分：来源不可靠\n2分：来源可靠性较低\n3分：来源一般可靠\n4分：来源较为权威\n5分：来源高度权威',
      '相关性': '请评估搜索结果的相关性（1-5分）：\n1分：完全不相关\n2分：相关性较低\n3分：部分相关\n4分：较为相关\n5分：高度相关',
      '时效性': '请评估搜索结果的时效性（1-5分）：\n1分：信息严重过时\n2分：信息较为过时\n3分：信息一般\n4分：信息较新\n5分：信息最新'
    } as Record<string, string>
  });

  // 监听评测轮数变化并通知父组件
  useEffect(() => {
    if (onEvaluationRoundsChange) {
      onEvaluationRoundsChange(queryConfig.evaluationRounds);
    }
  }, [queryConfig.evaluationRounds, onEvaluationRoundsChange]);

  /**
   * 更新维度权重
   */
  const updateDimensionWeight = (id: number, weight: number) => {
    setDimensions(dimensions.map(dim => 
      dim.id === id ? { ...dim, weight } : dim
    ));
  };

  /**
   * 切换维度启用状态
   */
  const toggleDimension = (id: number) => {
    setDimensions(dimensions.map(dim => 
      dim.id === id ? { ...dim, enabled: !dim.enabled } : dim
    ));
  };

  /**
   * 开始评测
   */
  const startEvaluation = async () => {
    // 验证输入
    if (!queryConfig.singleQuery.trim() && !queryConfig.batchQueries.trim()) {
      setErrorMessage('请输入查询内容');
      return;
    }

    if (searchEngines.length === 0) {
      setErrorMessage('请配置至少一个搜索引擎');
      return;
    }

    const enabledDimensions = dimensions.filter(dim => dim.enabled);
    if (enabledDimensions.length === 0) {
      setErrorMessage('请启用至少一个评测维度');
      return;
    }

    // 验证API配置
    const configValidation = validateEvaluationConfig(evaluationConfig);
    if (!configValidation.isValid) {
      setErrorMessage(`配置错误: ${configValidation.errors.join(', ')}`);
      return;
    }

    setErrorMessage('');
    setIsEvaluating(true);
    setEvaluationResults([]);

    try {
      // 更新API配置的评分制式
      const updatedApiConfig = {
        ...apiConfig,
        scoringSystem: queryConfig.scoringSystem
      };

      // 更新维度的提示词
      const updatedDimensions = dimensions.map(dim => ({
        ...dim,
        prompt: promptTemplates[queryConfig.scoringSystem][dim.name] || `请从${dim.name}角度评价搜索结果的质量`
      }));

      let results: EvaluationResult[];

      // 清空之前的结果
      if (clearResults) {
        clearResults();
      }
      
      if (queryConfig.singleQuery.trim()) {
        // 单条查询评测
        results = await runOptimizedSingleEvaluation(
          queryConfig.singleQuery.trim(),
          searchEngines,
          updatedDimensions,
          evaluationConfig,
          queryConfig.evaluationRounds,
          onEvaluationProgress,
          onSearchResult,
          onSseMessage
        );
      } else {
        // 批量查询评测
        const queries = parseBatchQueries(queryConfig.batchQueries);
        results = await runOptimizedBatchEvaluation(
          queries,
          searchEngines,
          updatedDimensions,
          evaluationConfig,
          queryConfig.evaluationRounds,
          onEvaluationProgress,
          onSearchResult,
          onSseMessage
        );
      }

      setEvaluationResults(results);
    } catch (error) {
      console.error('评测过程中出错:', error);
      setErrorMessage(`评测失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* 查询输入区 */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">查询配置</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            批量查询 (每行一个)
          </label>
          <textarea
            value={queryConfig.batchQueries}
            onChange={(e) => setQueryConfig({...queryConfig, batchQueries: e.target.value})}
            className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 sm:h-24 text-sm sm:text-base"
            placeholder="查询1\n查询2\n查询3"
          />
        </div>

        {/* 评测配置 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评测轮数
            </label>
            <select
              value={queryConfig.evaluationRounds}
              onChange={(e) => setQueryConfig({...queryConfig, evaluationRounds: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1轮</option>
              <option value={2}>2轮</option>
              <option value={3}>3轮</option>
              <option value={5}>5轮</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评分制式
            </label>
            <select
              value={queryConfig.scoringSystem}
              onChange={(e) => setQueryConfig({...queryConfig, scoringSystem: e.target.value as 'binary' | 'fivePoint'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="binary">二分制 (0-2)</option>
              <option value="fivePoint">五分制 (1-5)</option>
            </select>
          </div>
        </div>
      </div>



      {/* 错误信息显示 */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}



      {/* 提示词编辑区 */}
      <div className="space-y-3 sm:space-y-4">
        <PromptEditor
          dimensions={dimensions}
          setDimensions={setDimensions}
          promptTemplates={promptTemplates}
          setPromptTemplates={setPromptTemplates}
          scoringSystem={queryConfig.scoringSystem}
        />
      </div>

      {/* 开始评测按钮 */}
      <div className="pt-4">
        <button
          onClick={startEvaluation}
          disabled={isEvaluating || !apiConfig.apiUrl || !apiConfig.apiKey || !apiConfig.modelKey || !apiConfig.websearchUrl}
          className="w-full bg-blue-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
        >
          {isEvaluating ? '评测中...' : '开始评测'}
        </button>
        {(!apiConfig.apiUrl || !apiConfig.apiKey || !apiConfig.modelKey || !apiConfig.websearchUrl) && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            请在系统设置中完善API配置后开始评测
          </p>
        )}
      </div>
    </div>
  );
}