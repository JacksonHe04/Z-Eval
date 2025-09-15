/**
 * 应用类型定义文件
 */

/**
 * SSE消息回调函数类型
 */
export type SSEMessageCallback = (message: string, metadata?: {
  dimension?: string;
  engine?: string;
  query?: string;
}) => void;