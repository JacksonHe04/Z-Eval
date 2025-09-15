'use client';

import { useMemo } from 'react';

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

interface StreamLogsPanelProps {
  searchResults?: SearchResultCallback[];
  sseMessages?: Array<{
    message: string;
    timestamp: string;
    engine?: string;
    query?: string;
    dimension?: string;
  }>;
  isEvaluating: boolean;
}

interface LogEntry {
  id: string; // 用于标识同一API调用的日志
  timestamp: string;
  engine?: string;
  query?: string;
  type: string;
  content: string;
  details: string[];
  status: 'pending' | 'success' | 'error';
  isSse: boolean;
}

/**
 * 流式日志面板组件
 * 用于显示API调用和SSE流式响应的日志
 * 确保同一API调用的输出显示在同一区域
 */
export default function StreamLogsPanel({
  searchResults = [],
  sseMessages = [],
  isEvaluating
}: StreamLogsPanelProps) {
  /**
   * 处理日志数据，将同一API调用的日志合并在一起
   */
  const processedLogs = useMemo(() => {
    // 从searchResults中提取搜索请求日志信息
    const searchRequestLogs = searchResults.map(result => {
      // 为每个搜索请求创建唯一ID
      const logId = `search-${result.engineId}-${result.query}-${result.timestamp}`;
      
      return {
        id: logId,
        timestamp: result.timestamp,
        engine: result.engineName,
        query: result.query,
        type: '搜索请求',
        content: `获取到${result.searchResults.length}条搜索结果`,
        details: result.searchResults.map(sr => `${sr.rank}. ${sr.title}`).slice(0,4),
        status: 'success' as const,
        isSse: false
      };
    });
    
    // 创建API调用日志（模拟）
    const apiCallLogs = searchRequestLogs.map(log => {
      return {
        id: log.id, // 使用相同的ID关联API调用和结果
        timestamp: new Date(new Date(log.timestamp).getTime() - 500).toISOString(), // API调用稍早于结果
        engine: log.engine,
        query: log.query,
        type: 'API调用',
        content: '调用WebSearch API',
        details: [],
        status: 'pending' as const,
        isSse: false
      };
    });
    
    // 处理SSE消息，按API调用分组
    const sseLogGroups: Record<string, LogEntry[]> = {};
    
    sseMessages.forEach(sseMsg => {
      // 创建用于分组的键
      const groupKey = `sse-${sseMsg.engine || ''}-${sseMsg.query || ''}-${sseMsg.dimension || ''}`;
      
      // 解析SSE消息内容
      let parsedContent = sseMsg.message;
      let detailContent = [sseMsg.message];
      
      // 尝试解析JSON格式的SSE消息
      try {
        // 处理多行SSE数据
        const lines = sseMsg.message.split('\n').filter(line => line.trim().startsWith('data:'));
        if (lines.length > 0) {
          // 提取所有delta内容
          const deltaContents: string[] = [];
          
          for (const line of lines) {
            const jsonStr = line.replace(/^data: /, '').trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(jsonStr);
              if (data.choices && data.choices[0]?.delta?.content) {
                deltaContents.push(data.choices[0].delta.content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
          
          if (deltaContents.length > 0) {
            parsedContent = `收到模型流式响应片段`;
            detailContent = deltaContents;
          }
        }
      } catch (e) {
        // 如果解析失败，使用原始消息
      }
      
      const sseLog = {
        id: groupKey,
        timestamp: sseMsg.timestamp,
        engine: sseMsg.engine || '',
        query: sseMsg.query || '',
        type: 'SSE流',
        content: sseMsg.dimension ? `${sseMsg.dimension}维度评分` : parsedContent,
        details: detailContent,
        status: 'success' as const,
        isSse: true
      };
      
      // 将日志添加到对应的组
      if (!sseLogGroups[groupKey]) {
        sseLogGroups[groupKey] = [];
      }
      sseLogGroups[groupKey].push(sseLog);
    });
    
    // 将SSE日志组转换为合并后的日志条目
    const mergedSseLogs = Object.entries(sseLogGroups).map(([groupKey, logs]) => {
      // 按时间排序
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // 合并同一组的所有详情
      const allDetails = logs.flatMap(log => log.details);
      
      // 使用组中第一条日志的信息，但合并所有详情
      return {
        ...logs[0],
        details: allDetails,
        // 移除消息计数显示
        content: logs[0].content
      };
    });
    
    // 合并所有日志并按时间排序
    const allLogs = [...apiCallLogs, ...searchRequestLogs, ...mergedSseLogs].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return allLogs;
  }, [searchResults, sseMessages]);

  if (processedLogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p>暂无日志信息</p>
          <p className="text-sm mt-2">开始评测后将显示API调用和流式响应日志</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {processedLogs.map((log, index) => (
        <div key={log.id + '-' + index} className={`border-l-2 ${log.status === 'success' ? log.isSse ? 'border-purple-400' : 'border-green-400' : 'border-blue-300'} pl-3 py-2`}>
          <div className="flex items-center text-xs text-gray-500">
            <span className={`font-medium ${log.isSse ? 'text-purple-600' : ''}`}>{log.type}</span>
            <span className="mx-1">·</span>
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
            {log.status === 'pending' && (
              <div className="ml-2 flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                <span className="text-blue-600 font-medium">处理中</span>
              </div>
            )}
          </div>
          <div className="mt-1">
            {log.engine && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-2">
                {log.engine}
              </span>
            )}
            {log.query && <span className="text-sm">{log.query}</span>}
          </div>
          <p className="text-sm text-gray-700 mt-1">{log.content}</p>
          
          {log.details && log.details.length > 0 && (
            <div className={`mt-2 pl-2 border-l ${log.isSse ? 'border-purple-200 bg-purple-50 rounded p-2' : 'border-gray-200'}`}>
              {log.isSse ? (
                // SSE内容显示，使用pre标签保留格式
                <div className="max-h-60 overflow-y-auto">
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                    {log.details.join('')}
                  </pre>
                </div>
              ) : (
                // 普通日志内容显示
                <>
                  {log.details.map((detail, i) => (
                    <p key={i} className="text-xs text-gray-600 truncate">{detail}</p>
                  ))}
                  {log.details.length > 3 && !log.isSse && (
                    <p className="text-xs text-gray-500 mt-1">...</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
      {isEvaluating && processedLogs.some(log => log.status === 'pending') && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">正在处理...</span>
        </div>
      )}
    </div>
  );
}