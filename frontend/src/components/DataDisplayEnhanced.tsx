import { useAccount, useReadContract, useBlockNumber, useChainId } from 'wagmi';
import { getContractAddress, DataLoggerABI } from '../config/contracts';
import { formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { isBlockWatchingEnabled, useAutoRefresh } from '../config/autoRefresh';

interface DataRecord {
  id: bigint;
  sender: string;
  category: string;
  data: string;
  timestamp: bigint;
  blockNumber: bigint;
}

interface TransactionRecord {
  id: bigint;
  from: string;
  to: string;
  amount: bigint;
  memo: string;
  timestamp: bigint;
  blockNumber: bigint;
}

export function DataDisplayEnhanced() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const { data: blockNumber } = useBlockNumber({ 
    watch: isBlockWatchingEnabled()
  });
  const [activeTab, setActiveTab] = useState<'data' | 'tx'>('data');
  const { enabled: autoRefreshEnabled } = useAutoRefresh();
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [txRecords, setTxRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCount, setShowCount] = useState(5);

  // 获取用户的数据记录 IDs
  const { data: dataRecordIds, refetch: refetchDataIds, error: dataIdsError } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getUserDataRecordIds',
    args: address ? [address] : undefined,
  });

  // 获取用户的转账记录 IDs
  const { data: txRecordIds, refetch: refetchTxIds, error: txIdsError } = useReadContract({
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

  // 批量获取数据记录详情
  const fetchDataRecords = async () => {
    if (!dataRecordIds || dataRecordIds.length === 0 || !contractAddress) return;
    
    setLoading(true);
    try {
      const records = await Promise.all(
        dataRecordIds.slice(-10).reverse().map(async (id) => {
          const { data } = await useReadContract({
            address: contractAddress,
            abi: DataLoggerABI,
            functionName: 'getDataRecord',
            args: [id],
          });
          return data as DataRecord;
        })
      );
      setDataRecords(records.filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch data records:', error);
    } finally {
      setLoading(false);
    }
  };

  // 批量获取转账记录详情
  const fetchTxRecords = async () => {
    if (!txRecordIds || txRecordIds.length === 0 || !contractAddress) return;
    
    setLoading(true);
    try {
      const records = await Promise.all(
        txRecordIds.slice(-10).reverse().map(async (id) => {
          const { data } = await useReadContract({
            address: contractAddress,
            abi: DataLoggerABI,
            functionName: 'getTransactionRecord',
            args: [id],
          });
          return data as TransactionRecord;
        })
      );
      setTxRecords(records.filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch transaction records:', error);
    } finally {
      setLoading(false);
    }
  };

  // 当 IDs 变化时，获取详细记录
  useEffect(() => {
    if (activeTab === 'data') {
      fetchDataRecords();
    } else {
      fetchTxRecords();
    }
  }, [dataRecordIds, txRecordIds, activeTab]);

  // 监听区块变化，自动刷新
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
    if (activeTab === 'data') {
      await fetchDataRecords();
    } else {
      await fetchTxRecords();
    }
  };

  // 格式化时间
  const formatTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN');
  };

  // 格式化地址
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 错误处理
  if (!contractAddress) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">链上数据</h2>
        <div className="text-center py-8">
          <p className="text-amber-600 mb-2">⚠️ 合约未部署</p>
          <p className="text-sm text-gray-500">
            当前网络（Chain ID: {chainId}）没有部署合约
          </p>
        </div>
      </div>
    );
  }

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
            <span className="text-xs text-green-600 animate-pulse">
              🔄 自动刷新
            </span>
          )}
          <span className="text-xs text-gray-500">
            区块: {blockNumber?.toString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
          >
            {loading ? '加载中...' : '🔄 刷新'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {(dataIdsError || txIdsError) && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <p>读取合约数据时出错：</p>
          <p className="text-xs mt-1">{dataIdsError?.message || txIdsError?.message}</p>
        </div>
      )}

      {/* 统计信息 */}
      {recordCounts && (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">总数据记录</p>
            <p className="text-3xl font-bold text-gray-900">
              {recordCounts[0]?.toString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              我的记录: {dataRecordIds?.length || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">总转账记录</p>
            <p className="text-3xl font-bold text-gray-900">
              {recordCounts[1]?.toString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              我的记录: {txRecordIds?.length || 0}
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
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2 text-sm">加载数据...</p>
          </div>
        ) : (
          <>
            {activeTab === 'data' && (
              <div className="space-y-3">
                {dataRecordIds && dataRecordIds.length > 0 ? (
                  <>
                    {/* 显示最近的记录 */}
                    {dataRecordIds.slice(-showCount).reverse().map((id, index) => (
                      <DataRecordItem key={id.toString()} recordId={id} index={index} />
                    ))}
                    
                    {/* 加载更多按钮 */}
                    {dataRecordIds.length > showCount && (
                      <button
                        onClick={() => setShowCount(prev => Math.min(prev + 5, dataRecordIds.length))}
                        className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        显示更多（还有 {Math.max(0, dataRecordIds.length - showCount)} 条）
                      </button>
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
              <div className="space-y-3">
                {txRecordIds && txRecordIds.length > 0 ? (
                  <>
                    {/* 显示最近的记录 */}
                    {txRecordIds.slice(-showCount).reverse().map((id, index) => (
                      <TxRecordItem key={id.toString()} recordId={id} index={index} />
                    ))}
                    
                    {/* 加载更多按钮 */}
                    {txRecordIds.length > showCount && (
                      <button
                        onClick={() => setShowCount(prev => Math.min(prev + 5, txRecordIds.length))}
                        className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        显示更多（还有 {Math.max(0, txRecordIds.length - showCount)} 条）
                      </button>
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
          </>
        )}
      </div>

      {/* 调试信息 */}
      {import.meta.env.DEV && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">调试信息</summary>
            <div className="mt-2 space-y-1 font-mono text-xs">
              <p>合约地址: {contractAddress}</p>
              <p>用户地址: {address}</p>
              <p>Chain ID: {chainId}</p>
              <p>数据记录IDs: [{dataRecordIds?.map(id => id.toString()).join(', ')}]</p>
              <p>转账记录IDs: [{txRecordIds?.map(id => id.toString()).join(', ')}]</p>
              <p>当前区块: {blockNumber?.toString()}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

// 数据记录项组件
function DataRecordItem({ recordId, index }: { recordId: bigint; index: number }) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  
  const { data: record, isLoading } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getDataRecord',
    args: [recordId],
  });

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!record) return null;

  const formatTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN');
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className={`p-4 rounded-lg border transition-all hover:shadow-md ${
      index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            #{record.id.toString()}
          </span>
          {record.category && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              {record.category}
            </span>
          )}
          {index === 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
              最新
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {formatTime(record.timestamp)}
        </span>
      </div>
      <p className="text-sm text-gray-900 mb-2 break-all">
        {record.data}
      </p>
      <div className="text-xs text-gray-600 flex items-center gap-3">
        <span>发送者: {formatAddress(record.sender)}</span>
        <span>区块: {record.blockNumber.toString()}</span>
      </div>
    </div>
  );
}

// 转账记录项组件
function TxRecordItem({ recordId, index }: { recordId: bigint; index: number }) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  
  const { data: record, isLoading } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getTransactionRecord',
    args: [recordId],
  });

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!record) return null;

  const formatTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN');
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className={`p-4 rounded-lg border transition-all hover:shadow-md ${
      index === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            #{record.id.toString()}
          </span>
          <span className="text-sm font-medium text-green-700">
            {formatEther(record.amount)} ETH
          </span>
          {index === 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
              最新
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {formatTime(record.timestamp)}
        </span>
      </div>
      
      <p className="text-sm text-gray-900 mb-2">
        备注: {record.memo}
      </p>
      
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <span>从: {formatAddress(record.from)}</span>
          <span>→</span>
          <span>到: {formatAddress(record.to)}</span>
        </div>
        <span>区块: {record.blockNumber.toString()}</span>
      </div>
    </div>
  );
}
