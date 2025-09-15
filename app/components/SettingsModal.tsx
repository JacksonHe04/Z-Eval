'use client';

import { useState } from 'react';

interface SearchEngine {
  id: number;
  code: string;
  name: string;
}

interface ApiConfig {
  websearchUrl: string;
  apiUrl: string;
  apiKey: string;
  modelKey: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchEngines: SearchEngine[];
  setSearchEngines: (engines: SearchEngine[]) => void;
  apiConfig: ApiConfig;
  setApiConfig: (config: ApiConfig) => void;
}

/**
 * 设置弹窗组件
 * 包含模型配置、服务地址、搜索引擎API和搜索引擎选择
 */
export default function SettingsModal({
  isOpen,
  onClose,
  searchEngines,
  setSearchEngines,
  apiConfig,
  setApiConfig
}: SettingsModalProps) {
  // 使用传入的API配置状态，无需本地状态
  
  // 新增搜索引擎表单状态
  const [newEngineCode, setNewEngineCode] = useState('');
  const [newEngineName, setNewEngineName] = useState('');
  const [showAddEngineForm, setShowAddEngineForm] = useState(false);

  /**
   * 更新搜索引擎信息
   */
  const updateSearchEngine = (id: number, field: 'code' | 'name', value: string) => {
    setSearchEngines(searchEngines.map(engine => 
      engine.id === id ? { ...engine, [field]: value } : engine
    ));
  };

  /**
   * 删除搜索引擎
   */
  const deleteSearchEngine = (id: number) => {
    if (searchEngines.length <= 1) {
      alert('至少需要保留一个搜索引擎');
      return;
    }
    if (confirm('确定要删除这个搜索引擎吗？')) {
      setSearchEngines(searchEngines.filter(engine => engine.id !== id));
    }
  };

  /**
   * 新增搜索引擎
   */
  const addSearchEngine = () => {
    if (!newEngineCode.trim() || !newEngineName.trim()) {
      alert('请填写完整的搜索引擎信息');
      return;
    }

    if (searchEngines.some(engine => engine.code === newEngineCode.trim())) {
      alert('该搜索引擎编码已存在');
      return;
    }

    const newEngine: SearchEngine = {
      id: Math.max(...searchEngines.map(e => e.id), 0) + 1,
      code: newEngineCode.trim(),
      name: newEngineName.trim()
    };

    setSearchEngines([...searchEngines, newEngine]);
    setNewEngineCode('');
    setNewEngineName('');
    setShowAddEngineForm(false);
  };

  /**
   * 更新API配置
   */
  const updateApiConfig = (field: keyof ApiConfig, value: string) => {
    setApiConfig({
      ...apiConfig,
      [field]: value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">系统设置</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="p-6 space-y-6">
          {/* 搜索引擎配置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">搜索引擎配置</h3>
            
            {/* 搜索引擎管理 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  搜索引擎配置
                </label>
                <button
                  onClick={() => setShowAddEngineForm(!showAddEngineForm)}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                >
                  新增搜索引擎
                </button>
              </div>
              
              {/* 新增搜索引擎表单 */}
              {showAddEngineForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-3">
                  <h4 className="text-sm font-medium text-blue-800">新增搜索引擎</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">搜索引擎编码</label>
                      <input
                        type="text"
                        value={newEngineCode}
                        onChange={(e) => setNewEngineCode(e.target.value)}
                        placeholder="如: search_pro_baidu"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">搜索引擎名称</label>
                      <input
                        type="text"
                        value={newEngineName}
                        onChange={(e) => setNewEngineName(e.target.value)}
                        placeholder="如: 百度搜索"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={addSearchEngine}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      确认新增
                    </button>
                    <button
                      onClick={() => setShowAddEngineForm(false)}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
              
              {/* 搜索引擎列表 */}
              <div className="space-y-2">
                {searchEngines.map(engine => (
                  <div key={engine.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">编码</label>
                        <input
                          type="text"
                          value={engine.code}
                          onChange={(e) => updateSearchEngine(engine.id, 'code', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">名称</label>
                        <input
                          type="text"
                          value={engine.name}
                          onChange={(e) => updateSearchEngine(engine.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSearchEngine(engine.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="删除搜索引擎"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Websearch URL
              </label>
              <input
                type="url"
                value={apiConfig.websearchUrl}
                onChange={(e) => updateApiConfig('websearchUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://open.bigmodel.cn/api/paas/v4/web_search"
              />
            </div>
          </div>

          {/* 评分模型配置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">评分模型配置</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API URL
              </label>
              <input
                type="url"
                value={apiConfig.apiUrl}
                onChange={(e) => updateApiConfig('apiUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://open.bigmodel.cn/api/paas/v4/chat/completions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型API密钥
              </label>
              <input
                type="password"
                value={apiConfig.apiKey}
                onChange={(e) => updateApiConfig('apiKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入模型API密钥"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型key
              </label>
              <input
                type="text"
                value={apiConfig.modelKey}
                onChange={(e) => updateApiConfig('modelKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="glm-4-plus"
              />
            </div>
          </div>
        </div>

        {/* 弹窗底部 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            取消
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}