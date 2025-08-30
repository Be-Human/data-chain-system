import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { queryGraph, GRAPH_QUERIES } from '../lib/graphQuery';
import { useAutoRefresh, getRefreshInterval } from '../config/autoRefresh';

export function GraphDataDisplay() {
  const { enabled: autoRefreshEnabled } = useAutoRefresh();
  const refreshInterval = getRefreshInterval();
  
  // 使用 React Query 查询数据记录
  const { 
    data: graphData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['graphData'],
    queryFn: () => queryGraph(GRAPH_QUERIES.GET_DATA_RECORDS, { first: 10, skip: 0 }),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false, // 根据设置控制刷新
  });

  // 查询交易记录
  const { 
    data: txData, 
    isLoading: txLoading,
    refetch: refetchTx
  } = useQuery({
    queryKey: ['graphTx'],
    queryFn: () => queryGraph(GRAPH_QUERIES.GET_TRANSACTION_RECORDS, { first: 10, skip: 0 }),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCategory = (category: string) => {
    // category 是 hex 格式，尝试解析
    if (category.startsWith('0x')) {
      // 简单显示 hex
      return category.slice(0, 10) + '...';
    }
    return category;
  };

  return (
    <div className="space-y-6">
      {/* 同步状态 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">🔮 The Graph 查询</h3>
        {graphData?._meta && (
          <div className="text-sm text-gray-600">
            <p>当前同步区块: {graphData._meta.block.number}</p>
          </div>
        )}
      </div>

      {/* 数据记录 */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">数据记录</h3>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '刷新'}
          </button>
        </div>

        {error && <p className="text-red-500">错误: {error.message}</p>}
        
        {graphData?.dataRecords && graphData.dataRecords.length > 0 ? (
          <div className="space-y-3">
            {graphData.dataRecords.map((record: any) => (
              <div key={record.id} className="border rounded p-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">ID:</span>
                    <span>{record.recordId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">发送者:</span>
                    <span className="font-mono">{formatAddress(record.sender)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">分类:</span>
                    <span>{formatCategory(record.category)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">数据:</span>
                    <span className="truncate max-w-xs">{record.data}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">区块:</span>
                    <span>{record.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">时间:</span>
                    <span className="text-xs">{formatTimestamp(record.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            {isLoading ? '加载中...' : '暂无数据'}
          </p>
        )}
      </div>

      {/* 交易记录 */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">交易记录</h3>
          <button
            onClick={() => refetchTx()}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={txLoading}
          >
            {txLoading ? '加载中...' : '刷新'}
          </button>
        </div>
        
        {txData?.transactionRecords && txData.transactionRecords.length > 0 ? (
          <div className="space-y-3">
            {txData.transactionRecords.map((record: any) => (
              <div key={record.id} className="border rounded p-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">从:</span>
                    <span className="font-mono">{formatAddress(record.from)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">到:</span>
                    <span className="font-mono">{formatAddress(record.to)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">金额:</span>
                    <span>{formatEther(BigInt(record.amount))} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">备注:</span>
                    <span>{record.memo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">区块:</span>
                    <span>{record.blockNumber}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            {txLoading ? '加载中...' : '暂无交易'}
          </p>
        )}
      </div>
    </div>
  );
}
