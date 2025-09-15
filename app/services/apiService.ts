/**
 * API服务模块
 * 提供WebSearch API和评测API的调用功能
 */

// WebSearch API请求参数接口
interface WebSearchRequest {
  search_query: string;
  search_engine: string;
  search_intent?: boolean;
  count?: number;
  search_domain_filter?: string;
  search_recency_filter?: string;
  content_size?: string;
  request_id?: string;
  user_id?: string;
}

// WebSearch API响应接口
interface WebSearchResponse {
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    rank: number;
  }>;
  total_count: number;
  request_id: string;
}

// 评测API请求参数接口
interface EvaluationRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// 评测API响应接口
interface EvaluationResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// API配置接口
interface ApiConfig {
  websearchUrl: string;
  evaluationUrl: string;
  apiKey: string;
  modelKey: string;
}

/**
 * WebSearch API调用服务
 * @param config API配置信息
 * @param request 搜索请求参数
 * @returns Promise<WebSearchResponse>
 */
export async function callWebSearchApi(
  config: ApiConfig,
  request: WebSearchRequest
): Promise<WebSearchResponse> {
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      search_query: request.search_query,
      search_engine: request.search_engine,
      search_intent: request.search_intent || false,
      count: request.count || 10,
      search_domain_filter: request.search_domain_filter || '',
      search_recency_filter: request.search_recency_filter || 'noLimit',
      content_size: request.content_size || 'medium',
      request_id: request.request_id || generateRequestId(),
      user_id: request.user_id || 'default_user'
    })
  };

  try {
    const response = await fetch(config.websearchUrl, options);
    
    if (!response.ok) {
      throw new Error(`WebSearch API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 处理API响应数据结构，将search_result映射到results
    if (data.search_result && Array.isArray(data.search_result)) {
      return {
        results: data.search_result.map((item: any, index: number) => ({
          title: item.title || '',
          url: item.url || '',
          snippet: item.snippet || item.content || '',
          rank: index + 1
        })),
        total_count: data.search_result.length,
        request_id: data.request_id || data.id || ''
      };
    }
    
    // 如果已经是期望的格式，直接返回
    return data;
  } catch (error) {
    console.error('WebSearch API调用错误:', error);
    throw error;
  }
}

/**
 * 评测API调用服务
 * @param config API配置信息
 * @param request 评测请求参数
 * @returns Promise<EvaluationResponse>
 */
export async function callEvaluationApi(
  config: ApiConfig,
  request: EvaluationRequest
): Promise<EvaluationResponse> {
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.modelKey,
      messages: request.messages,
      temperature: request.temperature || 0.6,
      max_tokens: request.max_tokens || 4000,
      stream: request.stream || false
    })
  };

  try {
    const response = await fetch(config.evaluationUrl, options);
    
    if (!response.ok) {
      throw new Error(`评测API调用失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('评测API调用错误:', error);
    throw error;
  }
}

/**
 * 生成唯一请求ID
 * @returns string
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 构建评测提示词
 * @param query 用户查询
 * @param searchResults 搜索结果
 * @param dimensionPrompt 维度提示词
 * @param scoringSystem 评分制式
 * @returns string
 */
export function buildEvaluationPrompt(
  query: string,
  searchResults: Array<{ title: string; url: string; snippet: string; rank: number }>,
  dimensionPrompt: string,
  scoringSystem: 'binary' | 'fivePoint'
): string {
  // 检查searchResults是否为空或undefined
  if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
    throw new Error('搜索结果为空或无效，无法生成评测提示词');
  }
  
  const resultsText = searchResults
    .map((result, index) => 
      `${index + 1}. 标题: ${result.title}\n   链接: ${result.url}\n   摘要: ${result.snippet}\n`
    )
    .join('\n');

  const scoreRange = scoringSystem === 'binary' ? '0-1分' : '1-5分';
  
  return `你是一个专业的搜索引擎评测专家。请按照以下要求对搜索结果进行评分：

查询内容：${query}

搜索结果：
${resultsText}

评测维度：${dimensionPrompt}

请按照以下结构化格式输出你的评测结果：

## 评测分析
[请从${dimensionPrompt}的角度详细评价搜索结果，说明评分理由]

## 得分结果
评分范围：${scoreRange}
最终得分：[具体数字分数]

注意：最终得分必须是${scoreRange}范围内的数字，请确保在"最终得分："后面给出明确的数字分数。`;
}

export type { WebSearchRequest, WebSearchResponse, EvaluationRequest, EvaluationResponse, ApiConfig };