import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { queryGraph, GRAPH_QUERIES } from '../lib/graphQuery';
import { useAutoRefresh, getRefreshInterval } from '../config/autoRefresh';
import { useAccount } from 'wagmi';

// 查询模板
const QUERY_TEMPLATES = {
  recent24h: {
    name: '最近24小时',
    query: `
      query Recent24Hours($timestamp: BigInt!) {
        dataRecords(where: { timestamp_gte: $timestamp }, orderBy: timestamp, orderDirection: desc) {
          id
          recordId
          sender
          category
          data
          timestamp
          blockNumber
        }
      }
    `,
    variables: () => ({
      timestamp: Math.floor(Date.now() / 1000 - 86400).toString()
    })
  },
  myRecords: {
    name: '我的记录',
    query: `
      query MyRecords($address: Bytes!) {
        dataRecords(where: { sender: $address }, orderBy: timestamp, orderDirection: desc) {
          id
          recordId
          sender
          category
          data
          timestamp
          blockNumber
        }
      }
    `,
    variables: (address: string) => ({
      address: address?.toLowerCase()
    })
  },
  largeTransactions: {
    name: '大额交易',
    query: `
      query LargeTransactions($minAmount: BigInt!) {
        transactionRecords(where: { amount_gte: $minAmount }, orderBy: amount, orderDirection: desc) {
          id
          recordId
          from
          to
          amount
          memo
          timestamp
          blockNumber
        }
      }
    `,
    variables: () => ({
      minAmount: "1000000000000000000" // 1 ETH
    })
  },
  recentActivity: {
    name: '最新活动',
    query: `
      query RecentActivity {
        dataRecords(first: 5, orderBy: blockNumber, orderDirection: desc) {
          id
          sender
          category
          data
          timestamp
        }
        transactionRecords(first: 5, orderBy: blockNumber, orderDirection: desc) {
          id
          from
          to
          amount
          memo
          timestamp
        }
      }
    `,
    variables: () => ({})
  }
};

export function GraphDataDisplayOptimized() {
  const { address } = useAccount();
  const { enabled: autoRefreshEnabled } = useAutoRefresh();
  const refreshInterval = getRefreshInterval();
  
  // UI 状态
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [customVariables, setCustomVariables] = useState('{}');
  const [customQueryResult, setCustomQueryResult] = useState<any>(null);
  const [customQueryError, setCustomQueryError] = useState<string | null>(null);
  const [isExecutingCustom, setIsExecutingCustom] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // 默认查询 - 数据记录
  const { 
    data: graphData, 
    isLoading, 
    error,
    refetch: refetchData
  } = useQuery({
    queryKey: ['graphData'],
    queryFn: () => queryGraph(GRAPH_QUERIES.GET_DATA_RECORDS, { first: 10, skip: 0 }),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
  });

  // 默认查询 - 交易记录
  const { 
    data: txData, 
    isLoading: txLoading,
    error: txError,
    refetch: refetchTx
  } = useQuery({
    queryKey: ['graphTx'],
    queryFn: () => queryGraph(GRAPH_QUERIES.GET_TRANSACTION_RECORDS, { first: 10, skip: 0 }),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
  });

  // 执行自定义查询
  const executeCustomQuery = async () => {
    setIsExecutingCustom(true);
    setCustomQueryError(null);
    setCustomQueryResult(null);
    
    try {
      let variables = {};
      if (customVariables.trim()) {
        variables = JSON.parse(customVariables);
      }
      
      const result = await queryGraph(customQuery, variables);
      setCustomQueryResult(result);
    } catch (error: any) {
      setCustomQueryError(error.message || '查询执行失败');
    } finally {
      setIsExecutingCustom(false);
    }
  };
  
  // 应用查询模板
  const applyTemplate = (templateKey: string) => {
    const template = QUERY_TEMPLATES[templateKey as keyof typeof QUERY_TEMPLATES];
    if (template) {
      setCustomQuery(template.query);
      setCustomVariables(JSON.stringify(template.variables(address || ''), null, 2));
      setSelectedTemplate(templateKey);
      if (!showQueryEditor) {
        setShowQueryEditor(true);
      }
    }
  };
  
  // 刷新所有数据
  const refreshAll = async () => {
    await Promise.all([refetchData(), refetchTx()]);
  };

  // 格式化函数
  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString('zh-CN');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCategory = (category: string) => {
    if (category.startsWith('0x')) {
      try {
        // 尝试从 hex 解码
        const hex = category.slice(2);
        const str = Buffer.from(hex, 'hex').toString('utf8');
        // 检查是否是有效的 UTF-8
        if (/^[\x20-\x7E]*$/.test(str) && str.length > 0) {
          return str;
        }
      } catch {}
      return category.slice(0, 10) + '...';
    }
    return category;
  };

  return (
    <div className="space-y-4">
      {/* 顶部控制栏 */}
      <div className="card bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🔮 The Graph 查询中心</h2>
            <p className="text-xs text-gray-600 mt-1">
              {graphData?._meta && `同步区块: ${graphData._meta.block.number}`}
              {error && <span className="text-red-500 ml-2">连接错误</span>}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowQueryEditor(!showQueryEditor)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                showQueryEditor 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
              }`}
            >
              {showQueryEditor ? '🔽 隐藏' : '🔍 显示'} 查询编辑器
            </button>
            <button
              onClick={refreshAll}
              disabled={isLoading || txLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              🔄 刷新数据
            </button>
          </div>
        </div>
      </div>
      
      {/* 可折叠的查询编辑器 */}
      {showQueryEditor && (
        <div className="card bg-gray-50 border-2 border-purple-200">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">📝 GraphQL 查询编辑器</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 查询输入 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-700">查询</label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="">选择模板...</option>
                    {Object.entries(QUERY_TEMPLATES).map(([key, template]) => (
                      <option key={key} value={key}>{template.name}</option>
                    ))}
                  </select>
                </div>
                <textarea 
                  value={customQuery}
                  onChange={(e) => {
                    setCustomQuery(e.target.value);
                    setSelectedTemplate(null);
                  }}
                  placeholder="输入 GraphQL 查询..."
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* 变量输入 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  变量 (JSON 格式)
                </label>
                <textarea 
                  value={customVariables}
                  onChange={(e) => setCustomVariables(e.target.value)}
                  placeholder='{"first": 10, "skip": 0}'
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* 执行按钮和错误提示 */}
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={executeCustomQuery}
                disabled={!customQuery || isExecutingCustom}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {isExecutingCustom ? '执行中...' : '▶ 执行查询'}
              </button>
              
              {customQueryError && (
                <p className="text-red-500 text-xs">{customQueryError}</p>
              )}
            </div>
          </div>
          
          {/* 自定义查询结果 */}
          {customQueryResult && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">查询结果</h4>
              <div className="bg-white p-4 rounded-lg border border-gray-200 max-h-60 overflow-auto">
                <pre className="text-xs text-gray-800">
                  {JSON.stringify(customQueryResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 快速查询模板 */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">⚡ 快速查询</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(QUERY_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* 两栏数据展示 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 左栏：数据记录 */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">📝 数据记录</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {graphData?.dataRecords?.length || 0} 条
              </span>
              <button
                onClick={() => refetchData()}
                disabled={isLoading}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                刷新
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">加载中...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 text-sm">加载失败</p>
                <p className="text-xs text-gray-500 mt-1">{error.message}</p>
              </div>
            ) : graphData?.dataRecords && graphData.dataRecords.length > 0 ? (
              graphData.dataRecords.map((record: any) => (
                <div key={record.id} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-blue-700">
                      #{record.recordId}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(record.timestamp)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">发送者:</span>
                      <span className="font-mono">{formatAddress(record.sender)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">分类:</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {formatCategory(record.category)}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-600">数据:</span>
                      <p className="mt-1 text-gray-800 break-all line-clamp-2">
                        {record.data}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>区块: {record.blockNumber}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">暂无数据</p>
                <p className="text-xs text-gray-400 mt-1">上传数据后会显示在这里</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 右栏：交易记录 */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">💰 交易记录</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {txData?.transactionRecords?.length || 0} 条
              </span>
              <button
                onClick={() => refetchTx()}
                disabled={txLoading}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                刷新
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {txLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">加载中...</p>
              </div>
            ) : txError ? (
              <div className="text-center py-8">
                <p className="text-red-500 text-sm">加载失败</p>
                <p className="text-xs text-gray-500 mt-1">{(txError as any).message}</p>
              </div>
            ) : txData?.transactionRecords && txData.transactionRecords.length > 0 ? (
              txData.transactionRecords.map((record: any) => (
                <div key={record.id} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-green-700">
                      #{record.recordId}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(record.timestamp)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-green-700">
                      {formatEther(BigInt(record.amount))} ETH
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>从:</span>
                      <span className="font-mono">{formatAddress(record.from)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>到:</span>
                      <span className="font-mono">{formatAddress(record.to)}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-600">备注:</span>
                      <p className="mt-1 text-gray-800 break-all line-clamp-2">
                        {record.memo || '无'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>区块: {record.blockNumber}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">暂无交易</p>
                <p className="text-xs text-gray-400 mt-1">进行转账后会显示在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 底部统计信息 */}
      <div className="card bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600">总数据记录</p>
            <p className="text-xl font-bold text-gray-900">
              {graphData?.dataRecords?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">总交易记录</p>
            <p className="text-xl font-bold text-gray-900">
              {txData?.transactionRecords?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">同步状态</p>
            <p className="text-xl font-bold text-green-600">
              {graphData?._meta ? '✅' : '⏸️'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">自动刷新</p>
            <p className="text-xl font-bold text-blue-600">
              {autoRefreshEnabled ? '🔄' : '⏸️'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
