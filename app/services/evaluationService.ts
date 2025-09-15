/**
 * 评测服务模块
 * 整合WebSearch API和评测API，实现完整的搜索引擎评测流程
 */

import { 
  callWebSearchApi, 
  callEvaluationApi, 
  buildEvaluationPrompt,
  type ApiConfig,
  type WebSearchResponse 
} from './apiService';

// 搜索引擎配置接口
interface SearchEngine {
  id: number;
  code: string;
  name: string;
}

// 评测维度配置接口
interface Dimension {
  id: number;
  name: string;
  weight: number;
  enabled: boolean;
  prompt?: string;
}

// 评测配置接口
interface EvaluationConfig {
  apiUrl: string;
  modelApiKey: string;
  modelKey: string;
  websearchUrl: string;
  scoringSystem: 'binary' | 'fivePoint';
}

// 评测结果接口
interface EvaluationResult {
  engineId: number;
  engineName: string;
  query: string;
  round: number;
  searchResults: Array<{
    title: string;
    url: string;
    snippet: string;
    rank: number;
  }>;
  scores: Record<string, number>;
  weightedScore: number;
  timestamp: string;
}

// 评测进度回调接口
interface EvaluationProgress {
  currentEngine: string;
  currentRound: number;
  totalRounds: number;
  currentDimension?: string;
  progress: number; // 0-100
}

// 搜索结果回调接口
interface SearchResultCallback {
  engineId: number;
  engineName: string;
  query: string;
  searchResults: Array<{
    title: string;
    url: string;
    snippet: string;
    rank: number;
  }>;
  timestamp: string;
}

/**
 * 执行单个搜索引擎的评测
 * @param query 查询内容
 * @param searchEngine 搜索引擎配置
 * @param dimensions 评测维度列表
 * @param config 评测配置
 * @param round 评测轮次
 * @returns Promise<EvaluationResult>
 */
/**
 * 使用预先获取的搜索结果进行评测
 */
export async function evaluateWithSearchResults(
  query: string,
  searchEngine: SearchEngine,
  dimensions: Dimension[],
  config: EvaluationConfig,
  round: number,
  searchResponse: WebSearchResponse
): Promise<EvaluationResult> {
  console.log(`开始评测搜索引擎 ${searchEngine.name}`);

  try {
    // 构建API配置
    const apiConfig: ApiConfig = {
      websearchUrl: config.websearchUrl,
      evaluationUrl: config.apiUrl,
      apiKey: config.modelApiKey,
      modelKey: config.modelKey
    };

    // 2. 对每个维度进行评分
    const scores: Record<string, number> = {};
    
    for (const dimension of dimensions.filter(d => d.enabled)) {
      try {
        const prompt = buildEvaluationPrompt(
          query,
          searchResponse.results,
          dimension.prompt || `请从${dimension.name}维度评价搜索结果的质量`,
          config.scoringSystem
        );

        const evaluationResponse = await callEvaluationApi(apiConfig, {
          model: config.modelKey,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的搜索引擎评测专家。请严格按照用户要求的结构化格式输出评测结果，确保在"最终得分："后面给出明确的数字分数。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 3000
        });

        // 解析评分结果 - 优先从"最终得分："标签中提取
        const responseContent = evaluationResponse.choices[0]?.message?.content || '0';
        let score = 0;
        
        // 尝试从"最终得分："标签中提取分数
        const finalScoreMatch = responseContent.match(/最终得分[：:](\s*)(\d+(?:\.\d+)?)/i);
        if (finalScoreMatch) {
          score = parseFloat(finalScoreMatch[2]);
        } else {
          // 备用方案：从整个文本中提取第一个数字
          const numberMatch = responseContent.match(/\d+(?:\.\d+)?/);
          if (numberMatch) {
            score = parseFloat(numberMatch[0]);
          }
        }
        
        scores[dimension.name] = score;
        
        console.log(`${dimension.name}维度评分: ${score}`);
      } catch (error) {
        console.error(`评分维度 ${dimension.name} 时出错:`, error);
        scores[dimension.name] = 0;
      }
    }

    // 3. 计算加权总分
    const weightedScore = calculateWeightedScore(scores, dimensions);

    return {
      engineId: searchEngine.id,
      engineName: searchEngine.name,
      query,
      round,
      searchResults: searchResponse.results,
      scores,
      weightedScore,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`评测搜索引擎 ${searchEngine.name} 时出错:`, error);
    throw error;
  }
}

/**
 * 原有的评测函数（包含搜索步骤）
 */
export async function evaluateSearchEngine(
  query: string,
  searchEngine: SearchEngine,
  dimensions: Dimension[],
  config: EvaluationConfig,
  round: number
): Promise<EvaluationResult> {
  try {
    // 1. 调用WebSearch API获取搜索结果
    const apiConfig: ApiConfig = {
      websearchUrl: config.websearchUrl,
      evaluationUrl: config.apiUrl,
      apiKey: config.modelApiKey,
      modelKey: config.modelKey
    };

    const searchResponse = await callWebSearchApi(apiConfig, {
      search_query: query,
      search_engine: searchEngine.code,
      count: 10
    });

    // 2. 对每个维度进行评分
    const scores: Record<string, number> = {};
    const enabledDimensions = dimensions.filter(dim => dim.enabled);

    for (const dimension of enabledDimensions) {
      const prompt = buildEvaluationPrompt(
        query,
        searchResponse.results,
        dimension.prompt || `请从${dimension.name}角度评价搜索结果的质量`,
        config.scoringSystem
      );

      const evaluationResponse = await callEvaluationApi(apiConfig, {
        model: config.modelKey,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // 解析评分结果
      const scoreText = evaluationResponse.choices[0]?.message?.content || '0';
      const score = parseFloat(scoreText.match(/\d+(\.\d+)?/)?.[0] || '0');
      scores[dimension.name] = score;
    }

    // 3. 计算加权总分
    const weightedScore = calculateWeightedScore(scores, enabledDimensions);

    return {
      engineId: searchEngine.id,
      engineName: searchEngine.name,
      query,
      round,
      searchResults: searchResponse.results,
      scores,
      weightedScore,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`评测搜索引擎 ${searchEngine.name} 时出错:`, error);
    throw error;
  }
}

/**
 * 优化版批量评测：先并行搜索，再统一评测
 * @param queries 查询列表
 * @param searchEngines 搜索引擎列表
 * @param dimensions 评测维度列表
 * @param config 评测配置
 * @param rounds 评测轮次
 * @param onProgress 进度回调函数
 * @param onSearchResult 搜索结果即时回调函数
 * @returns Promise<EvaluationResult[]>
 */
export async function runOptimizedBatchEvaluation(
  queries: string[],
  searchEngines: SearchEngine[],
  dimensions: Dimension[],
  config: EvaluationConfig,
  rounds: number,
  onProgress?: (progress: EvaluationProgress) => void,
  onSearchResult?: (searchResult: SearchResultCallback) => void
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  const totalTasks = queries.length * searchEngines.length * rounds;
  let completedTasks = 0;

  for (const query of queries) {
    // 第一阶段：并行执行所有搜索引擎的查询
    const searchPromises = searchEngines.map(async (engine) => {
      try {
        const apiConfig: ApiConfig = {
          websearchUrl: config.websearchUrl,
          evaluationUrl: config.apiUrl,
          apiKey: config.modelApiKey,
          modelKey: config.modelKey
        };

        const searchResponse = await callWebSearchApi(apiConfig, {
          search_query: query,
          search_engine: engine.code,
          count: 10
        });

        // 立即回调搜索结果
        if (onSearchResult) {
          onSearchResult({
            engineId: engine.id,
            engineName: engine.name,
            query,
            searchResults: searchResponse.results,
            timestamp: new Date().toISOString()
          });
        }

        return { engine, searchResponse };
      } catch (error) {
        console.error(`搜索失败 - 查询: ${query}, 引擎: ${engine.name}`, error);
        return { engine, searchResponse: null };
      }
    });

    // 等待所有搜索完成
    const searchResults = await Promise.all(searchPromises);

    // 第二阶段：对所有搜索结果进行评测
    for (const { engine, searchResponse } of searchResults) {
      if (!searchResponse) {
        console.error(`跳过评分 - 查询: ${query}, 引擎: ${engine.name} (搜索失败)`);
        continue;
      }

      for (let round = 1; round <= rounds; round++) {
        try {
          // 更新进度
          if (onProgress) {
            onProgress({
              currentEngine: engine.name,
              currentRound: round,
              totalRounds: rounds,
              progress: Math.round((completedTasks / totalTasks) * 100)
            });
          }

          // 使用已获取的搜索结果进行评分
          const result = await evaluateWithSearchResults(
            query,
            engine,
            dimensions,
            config,
            round,
            searchResponse
          );
          
          results.push(result);
          completedTasks++;

          // 添加延迟避免API限流
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`评测失败 - 查询: ${query}, 引擎: ${engine.name}, 轮次: ${round}`, error);
          completedTasks++;
        }
      }
    }
  }

  // 完成进度回调
  if (onProgress) {
    onProgress({
      currentEngine: '完成',
      currentRound: rounds,
      totalRounds: rounds,
      progress: 100
    });
  }

  return results;
}

/**
 * 原版批量评测（保持向后兼容）
 * @param queries 查询列表
 * @param searchEngines 搜索引擎列表
 * @param dimensions 评测维度列表
 * @param config 评测配置
 * @param rounds 评测轮次
 * @param onProgress 进度回调函数
 * @returns Promise<EvaluationResult[]>
 */
export async function runBatchEvaluation(
  queries: string[],
  searchEngines: SearchEngine[],
  dimensions: Dimension[],
  config: EvaluationConfig,
  rounds: number,
  onProgress?: (progress: EvaluationProgress) => void
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  const totalTasks = queries.length * searchEngines.length * rounds;
  let completedTasks = 0;

  for (const query of queries) {
    // 先为每个搜索引擎获取一次搜索结果
    const searchResultsMap = new Map<number, WebSearchResponse>();
    
    for (const engine of searchEngines) {
      try {
        // 构建API配置
        const apiConfig: ApiConfig = {
          websearchUrl: config.websearchUrl,
          evaluationUrl: config.apiUrl,
          apiKey: config.modelApiKey,
          modelKey: config.modelKey
        };

        // 调用WebSearch API获取搜索结果（每个引擎只查询一次）
        const searchResponse = await callWebSearchApi(apiConfig, {
          search_query: query,
          search_engine: engine.code,
          count: 10
        });
        
        searchResultsMap.set(engine.id, searchResponse);
        
        // 添加延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`搜索失败 - 查询: ${query}, 引擎: ${engine.name}`, error);
      }
    }

    // 然后对每个搜索结果进行多轮评分
    for (const engine of searchEngines) {
      const searchResponse = searchResultsMap.get(engine.id);
      if (!searchResponse) {
        console.error(`跳过评分 - 查询: ${query}, 引擎: ${engine.name} (搜索失败)`);
        continue;
      }

      for (let round = 1; round <= rounds; round++) {
        try {
          // 更新进度
          if (onProgress) {
            onProgress({
              currentEngine: engine.name,
              currentRound: round,
              totalRounds: rounds,
              progress: Math.round((completedTasks / totalTasks) * 100)
            });
          }

          // 使用已获取的搜索结果进行评分
          const result = await evaluateWithSearchResults(
            query,
            engine,
            dimensions,
            config,
            round,
            searchResponse
          );
          
          results.push(result);
          completedTasks++;

          // 添加延迟避免API限流
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`评测失败 - 查询: ${query}, 引擎: ${engine.name}, 轮次: ${round}`, error);
          completedTasks++;
        }
      }
    }
  }

  // 完成进度回调
  if (onProgress) {
    onProgress({
      currentEngine: '完成',
      currentRound: rounds,
      totalRounds: rounds,
      progress: 100
    });
  }

  return results;
}

/**
 * 优化版单次评测
 * @param query 单个查询
 * @param searchEngines 搜索引擎列表
 * @param dimensions 评测维度列表
 * @param config 评测配置
 * @param rounds 评测轮次
 * @param onProgress 进度回调函数
 * @param onSearchResult 搜索结果即时回调函数
 * @returns Promise<EvaluationResult[]>
 */
export async function runOptimizedSingleEvaluation(
  query: string,
  searchEngines: SearchEngine[],
  dimensions: Dimension[],
  config: EvaluationConfig,
  rounds: number,
  onProgress?: (progress: EvaluationProgress) => void,
  onSearchResult?: (searchResult: SearchResultCallback) => void
): Promise<EvaluationResult[]> {
  return runOptimizedBatchEvaluation(
    [query],
    searchEngines,
    dimensions,
    config,
    rounds,
    onProgress,
    onSearchResult
  );
}

/**
 * 原版单次评测（保持向后兼容）
 * @param query 单个查询
 * @param searchEngines 搜索引擎列表
 * @param dimensions 评测维度列表
 * @param config 评测配置
 * @param rounds 评测轮次
 * @param onProgress 进度回调函数
 * @returns Promise<EvaluationResult[]>
 */
export async function runSingleEvaluation(
  query: string,
  searchEngines: SearchEngine[],
  dimensions: Dimension[],
  config: EvaluationConfig,
  rounds: number,
  onProgress?: (progress: EvaluationProgress) => void
): Promise<EvaluationResult[]> {
  return runBatchEvaluation(
    [query],
    searchEngines,
    dimensions,
    config,
    rounds,
    onProgress
  );
}

/**
 * 计算加权总分
 * @param scores 各维度分数
 * @param dimensions 维度配置
 * @returns number
 */
function calculateWeightedScore(
  scores: Record<string, number>,
  dimensions: Dimension[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const dimension of dimensions) {
    if (scores[dimension.name] !== undefined) {
      weightedSum += scores[dimension.name] * dimension.weight;
      totalWeight += dimension.weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * 解析批量查询文本
 * @param batchText 批量查询文本（每行一个查询）
 * @returns string[]
 */
export function parseBatchQueries(batchText: string): string[] {
  return batchText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * 验证评测配置
 * @param config 评测配置
 * @returns { isValid: boolean; errors: string[] }
 */
export function validateEvaluationConfig(config: EvaluationConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.apiUrl || !config.apiUrl.trim()) {
    errors.push('API URL不能为空');
  }

  if (!config.modelApiKey || !config.modelApiKey.trim()) {
    errors.push('模型API密钥不能为空');
  }

  if (!config.modelKey || !config.modelKey.trim()) {
    errors.push('模型Key不能为空');
  }

  if (!config.websearchUrl || !config.websearchUrl.trim()) {
    errors.push('Websearch URL不能为空');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export type {
  SearchEngine,
  Dimension,
  EvaluationConfig,
  EvaluationResult,
  EvaluationProgress,
  SearchResultCallback
};