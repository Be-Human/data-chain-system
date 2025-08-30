import { useAccount, useReadContract, useBlockNumber, useChainId } from 'wagmi';
import { getContractAddress, DataLoggerABI } from '../config/contracts';
import { formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { isBlockWatchingEnabled, useAutoRefresh } from '../config/autoRefresh';

export function DataDisplay() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const { data: blockNumber } = useBlockNumber({ 
    watch: isBlockWatchingEnabled() // 使用自动刷新设置
  });
  const [activeTab, setActiveTab] = useState<'data' | 'tx'>('data');
  const { enabled: autoRefreshEnabled } = useAutoRefresh();
  // 获取用户的数据记录 IDs
  const { data: dataRecordIds, refetch: refetchDataIds } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getUserDataRecordIds',
    args: address ? [address] : undefined,
  });

  // 获取用户的转账记录 IDs
  const { data: txRecordIds, refetch: refetchTxIds } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getUserTransactionRecordIds',
    args: address ? [address] : undefined,
  });

  // 获取记录统计
  const { data: recordCounts, refetch: refetchCounts } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getRecordCounts',
  });

  // 获取单条数据记录（示例，只获取最新的）
  const latestDataId = dataRecordIds && dataRecordIds.length > 0 
    ? dataRecordIds[dataRecordIds.length - 1] 
    : undefined;

  const { data: latestDataRecord } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getDataRecord',
    args: latestDataId !== undefined ? [latestDataId] : undefined,
  });

  // 获取单条转账记录（示例，只获取最新的）
  const latestTxId = txRecordIds && txRecordIds.length > 0 
    ? txRecordIds[txRecordIds.length - 1] 
    : undefined;

  const { data: latestTxRecord } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getTransactionRecord',
    args: latestTxId !== undefined ? [latestTxId] : undefined,
  });

  // 监听区块变化，自动刷新（仅在启用时）
  useEffect(() => {
    if (autoRefreshEnabled && blockNumber) {
      refetchDataIds();
      refetchTxIds();
      refetchCounts();
    }
  }, [blockNumber, autoRefreshEnabled]);

  // 手动刷新
  const handleRefresh = async () => {
    console.log('Refreshing data...');
    await Promise.all([
      refetchDataIds(),
      refetchTxIds(),
      refetchCounts()
    ]);
    console.log('Data refreshed!');
  };

  // 格式化时间
  const formatTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN');
  };

  // 格式化地址
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">链上数据</h2>
        <p className="text-gray-500 text-center py-8">
          请先连接钱包查看数据
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">链上数据</h2>
        <div className="flex items-center gap-2">
          {autoRefreshEnabled && (
            <span className="text-xs text-green-600">
              🔄 自动刷新
            </span>
          )}
          <span className="text-xs text-gray-500">
            区块: {blockNumber?.toString()}
          </span>
          <button
            onClick={handleRefresh}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
          >
            🔄 刷新
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      {recordCounts && (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">总数据记录</p>
            <p className="text-2xl font-bold text-gray-900">
              {recordCounts[0]?.toString() || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">总转账记录</p>
            <p className="text-2xl font-bold text-gray-900">
              {recordCounts[1]?.toString() || '0'}
            </p>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 py-2 px-4 rounded-md transition-all text-sm ${
            activeTab === 'data' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 数据记录 ({dataRecordIds?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('tx')}
          className={`flex-1 py-2 px-4 rounded-md transition-all text-sm ${
            activeTab === 'tx' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          💰 转账记录 ({txRecordIds?.length || 0})
        </button>
      </div>

      {/* 内容区域 */}
      <div className="min-h-[200px]">
        {activeTab === 'data' && (
          <div className="space-y-2">
            {dataRecordIds && dataRecordIds.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  显示最新的记录 (ID: {latestDataId?.toString()})
                </p>
                {latestDataRecord && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-blue-700">
                        #{latestDataRecord.id.toString()} · {latestDataRecord.category}
                      </span>
                      <span className="text-xs text-blue-600">
                        {formatTime(latestDataRecord.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2 break-all">
                      {latestDataRecord.data}
                    </p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>发送者: {formatAddress(latestDataRecord.sender)}</p>
                      <p>区块: {latestDataRecord.blockNumber.toString()}</p>
                    </div>
                  </div>
                )}
                {dataRecordIds.length > 1 && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    还有 {dataRecordIds.length - 1} 条更早的记录
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">暂无数据记录</p>
                <p className="text-sm text-gray-400">上传数据后会显示在这里</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tx' && (
          <div className="space-y-2">
            {txRecordIds && txRecordIds.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  显示最新的记录 (ID: {latestTxId?.toString()})
                </p>
                {latestTxRecord && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-green-700">
                        #{latestTxRecord.id.toString()}
                      </span>
                      <span className="text-xs text-green-600">
                        {formatTime(latestTxRecord.timestamp)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-600">金额:</span>{' '}
                        <span className="font-medium text-green-700">
                          {formatEther(latestTxRecord.amount)} ETH
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-600">发送:</span>{' '}
                        <span className="font-mono text-xs">
                          {formatAddress(latestTxRecord.from)}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-600">接收:</span>{' '}
                        <span className="font-mono text-xs">
                          {formatAddress(latestTxRecord.to)}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-600">备注:</span>{' '}
                        {latestTxRecord.memo}
                      </p>
                      <p className="text-xs text-gray-500">
                        区块: {latestTxRecord.blockNumber.toString()}
                      </p>
                    </div>
                  </div>
                )}
                {txRecordIds.length > 1 && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    还有 {txRecordIds.length - 1} 条更早的记录
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">暂无转账记录</p>
                <p className="text-sm text-gray-400">使用转账方式上传后会显示在这里</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 调试信息（开发时可见） */}
      {import.meta.env.DEV && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">调试信息</summary>
            <div className="mt-2 space-y-1 font-mono">
              <p>Address: {address}</p>
              <p>Data IDs: [{dataRecordIds?.map(id => id.toString()).join(', ')}]</p>
              <p>TX IDs: [{txRecordIds?.map(id => id.toString()).join(', ')}]</p>
              <p>Block: {blockNumber?.toString()}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
