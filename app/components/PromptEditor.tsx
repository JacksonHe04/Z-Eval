'use client';

import { useState } from 'react';

interface Dimension {
  id: number;
  name: string;
  weight: number;
  enabled: boolean;
}

interface PromptTemplates {
  binary: Record<string, string>;
  fivePoint: Record<string, string>;
  [key: string]: Record<string, string>;
}

interface ScoringSystem {
  key: string;
  label: string;
  minScore: number;
  maxScore: number;
}

interface PromptEditorProps {
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  promptTemplates: PromptTemplates;
  setPromptTemplates: (templates: PromptTemplates) => void;
  scoringSystem: string;
}

/**
 * 提示词编辑器组件
 * 用于编辑各维度的评分提示词模板
 */
export default function PromptEditor({
  dimensions,
  setDimensions,
  promptTemplates,
  setPromptTemplates,
  scoringSystem
}: PromptEditorProps) {
  const [activeTab, setActiveTab] = useState<string>('binary');
  const [expandedDimensions, setExpandedDimensions] = useState<Record<string, boolean>>({});
  const [scoringSystems, setScoringSystems] = useState<ScoringSystem[]>([
    { key: 'binary', label: '二分制 (0-2分)', minScore: 0, maxScore: 2 },
    { key: 'fivePoint', label: '五分制 (1-5分)', minScore: 1, maxScore: 5 }
  ]);
  const [newSystemKey, setNewSystemKey] = useState('');
  const [newSystemLabel, setNewSystemLabel] = useState('');
  const [newSystemMinScore, setNewSystemMinScore] = useState(0);
  const [newSystemMaxScore, setNewSystemMaxScore] = useState(10);
  const [showAddSystemForm, setShowAddSystemForm] = useState(false);
  const [newDimensionName, setNewDimensionName] = useState('');
  const [showAddDimensionForm, setShowAddDimensionForm] = useState(false);

  /**
   * 切换维度展开状态
   */
  const toggleDimension = (dimensionName: string) => {
    setExpandedDimensions(prev => ({
      ...prev,
      [dimensionName]: !prev[dimensionName]
    }));
  };

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
  const toggleDimensionEnabled = (id: number) => {
    setDimensions(dimensions.map(dim => 
      dim.id === id ? { ...dim, enabled: !dim.enabled } : dim
    ));
  };

  /**
   * 更新维度名称
   */
  const updateDimensionName = (id: number, name: string) => {
    setDimensions(dimensions.map(dim => 
      dim.id === id ? { ...dim, name } : dim
    ));
  };

  /**
   * 更新提示词模板
   */
  const updatePromptTemplate = (system: string, dimensionName: string, content: string) => {
    setPromptTemplates({
      ...promptTemplates,
      [system]: {
        ...promptTemplates[system] || {},
        [dimensionName]: content
      }
    });
  };

  /**
   * 重置为默认模板
   */
  const resetToDefault = (system: string, dimensionName: string) => {
    const defaultTemplates: Record<string, Record<string, string>> = {
      binary: {
        '权威性': '请评估搜索结果的权威性（0-2分）：\n0分：来源不可靠或无权威性\n1分：来源一般可靠\n2分：来源高度权威可靠',
        '相关性': '请评估搜索结果的相关性（0-2分）：\n0分：与查询完全不相关\n1分：部分相关\n2分：高度相关',
        '时效性': '请评估搜索结果的时效性（0-2分）：\n0分：信息过时\n1分：信息较新\n2分：信息最新'
      },
      fivePoint: {
        '权威性': '请评估搜索结果的权威性（1-5分）：\n1分：来源不可靠\n2分：来源可靠性较低\n3分：来源一般可靠\n4分：来源较为权威\n5分：来源高度权威',
        '相关性': '请评估搜索结果的相关性（1-5分）：\n1分：完全不相关\n2分：相关性较低\n3分：部分相关\n4分：较为相关\n5分：高度相关',
        '时效性': '请评估搜索结果的时效性（1-5分）：\n1分：信息严重过时\n2分：信息较为过时\n3分：信息一般\n4分：信息较新\n5分：信息最新'
      }
    };

    const defaultTemplate = defaultTemplates[system]?.[dimensionName];
    if (defaultTemplate) {
      updatePromptTemplate(system, dimensionName, defaultTemplate);
    }
  };

  /**
   * 新增评分制式
   */
  const addScoringSystem = () => {
    if (!newSystemKey || !newSystemLabel || newSystemMinScore >= newSystemMaxScore) {
      alert('请填写完整的评分制式信息，并确保最小分数小于最大分数');
      return;
    }

    if (scoringSystems.some(s => s.key === newSystemKey)) {
      alert('该评分制式标识已存在');
      return;
    }

    const newSystem: ScoringSystem = {
      key: newSystemKey,
      label: newSystemLabel,
      minScore: newSystemMinScore,
      maxScore: newSystemMaxScore
    };

    setScoringSystems([...scoringSystems, newSystem]);
    
    // 初始化新评分制式的模板
    if (!promptTemplates[newSystemKey]) {
      setPromptTemplates({
        ...promptTemplates,
        [newSystemKey]: {}
      });
    }

    // 重置表单
    setNewSystemKey('');
    setNewSystemLabel('');
    setNewSystemMinScore(0);
    setNewSystemMaxScore(10);
    setShowAddSystemForm(false);
  };

  /**
   * 新增评测维度
   */
  const addDimension = () => {
    if (!newDimensionName.trim()) {
      alert('请输入维度名称');
      return;
    }

    if (dimensions.some(d => d.name === newDimensionName.trim())) {
      alert('该维度名称已存在');
      return;
    }

    const newDimension: Dimension = {
      id: Math.max(...dimensions.map(d => d.id), 0) + 1,
      name: newDimensionName.trim(),
      weight: 0.33,
      enabled: true
    };

    setDimensions([...dimensions, newDimension]);
    setNewDimensionName('');
    setShowAddDimensionForm(false);
  };

  /**
   * 删除维度
   */
  const deleteDimension = (id: number) => {
    if (dimensions.length <= 1) {
      alert('至少需要保留一个评测维度');
      return;
    }

    if (confirm('确定要删除这个维度吗？')) {
      setDimensions(dimensions.filter(d => d.id !== id));
    }
  };



  /**
   * 获取当前活跃的提示词模板
   */
  const getCurrentTemplates = () => {
    return promptTemplates[activeTab];
  };

  /**
   * 获取维度的提示词内容
   */
  const getDimensionPrompt = (dimensionName: string) => {
    return getCurrentTemplates()[dimensionName] || '';
  };

  return (
    <div className="space-y-4">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">评测维度配置</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddDimensionForm(!showAddDimensionForm)}
            className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
          >
            新增维度
          </button>
          <button
            onClick={() => setShowAddSystemForm(!showAddSystemForm)}
            className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
          >
            新增评分制式
          </button>
        </div>
      </div>

      {/* 新增评分制式表单 */}
      {showAddSystemForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-green-800">新增评分制式</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">制式标识</label>
              <input
                type="text"
                value={newSystemKey}
                onChange={(e) => setNewSystemKey(e.target.value)}
                placeholder="如: tenPoint"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">制式名称</label>
              <input
                type="text"
                value={newSystemLabel}
                onChange={(e) => setNewSystemLabel(e.target.value)}
                placeholder="如: 十分制 (1-10分)"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">最小分数</label>
              <input
                type="number"
                value={newSystemMinScore}
                onChange={(e) => setNewSystemMinScore(parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">最大分数</label>
              <input
                type="number"
                value={newSystemMaxScore}
                onChange={(e) => setNewSystemMaxScore(parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={addScoringSystem}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              确认新增
            </button>
            <button
              onClick={() => setShowAddSystemForm(false)}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 新增维度表单 */}
      {showAddDimensionForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-blue-800">新增评测维度</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">维度名称</label>
            <input
              type="text"
              value={newDimensionName}
              onChange={(e) => setNewDimensionName(e.target.value)}
              placeholder="如: 准确性"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={addDimension}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              确认新增
            </button>
            <button
              onClick={() => setShowAddDimensionForm(false)}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 评分体系标签页 */}
      <div className="flex flex-wrap gap-1">
        {scoringSystems.map(system => (
          <button
            key={system.key}
            onClick={() => setActiveTab(system.key)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === system.key
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {system.label}
            {scoringSystem === system.key && (
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">当前</span>
            )}
          </button>
        ))}
      </div>

      {/* 维度配置区域 */}
      <div className="space-y-3">
        {dimensions.map(dimension => {
          const isExpanded = expandedDimensions[dimension.name];
          const promptContent = getDimensionPrompt(dimension.name);
          
          return (
            <div key={dimension.id} className="border border-gray-200 rounded-lg">
              {/* 维度标题栏 */}
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleDimension(dimension.name)}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dimension.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleDimensionEnabled(dimension.id);
                    }}
                    className="mr-2"
                  />
                  <input
                    type="text"
                    value={dimension.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateDimensionName(dimension.id, e.target.value);
                    }}
                    className="font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:bg-white focus:border focus:border-blue-500 focus:rounded px-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    权重: {(dimension.weight * 100).toFixed(0)}%
                  </span>
                  {promptContent && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      已配置
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetToDefault(activeTab, dimension.name);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="重置为默认模板"
                  >
                    重置
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDimension(dimension.id);
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                    title="删除维度"
                  >
                    删除
                  </button>
                  <svg 
                    className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* 维度配置内容 */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-3">
                  <div className="space-y-4">
                    {/* 权重设置 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        权重设置
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={dimension.weight}
                        onChange={(e) => updateDimensionWeight(dimension.id, parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!dimension.enabled}
                      />
                    </div>

                    {/* 提示词输入框 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {dimension.name}评分提示词
                      </label>
                      <textarea
                        value={promptContent}
                        onChange={(e) => updatePromptTemplate(activeTab, dimension.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 text-sm font-mono"
                        placeholder={`请输入${dimension.name}维度的评分提示词...`}
                        disabled={!dimension.enabled}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 全局操作 */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            当前编辑: {activeTab === 'binary' ? '二分制' : '五分制'} | 
            已配置维度: {Object.keys(getCurrentTemplates()).length}/{dimensions.filter(d => d.enabled).length}
          </span>
        </div>
      </div>
    </div>
  );
}