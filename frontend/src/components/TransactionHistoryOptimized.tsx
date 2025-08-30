import { useState, useEffect } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { formatEther, hexToString } from 'viem';
import { getAssetTransfers, getAlchemyStatus } from '../services/alchemy';
import { getContractAddress } from '../config/contracts';

interface Transfer {
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string;
  category: string;
  metadata?: {
    blockTimestamp: string;
  };
  inputData?: `0x${string}`;
  parsedData?: {
    type: 'empty' | 'text' | 'contract' | 'hex';
    content: string;
  };
}

type FilterType = 'all' | 'transfers' | 'with-data' | 'tokens';
type DataSource = 'none' | 'loading' | 'loaded';

export function TransactionHistoryOptimized() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('none');
  const [showCount, setShowCount] = useState(10);
  
  // 获取合约地址（用于过滤）
  const contractAddress = getContractAddress(chainId);
  const OUR_CONTRACT = contractAddress?.toLowerCase() || '';
  
  // 缓存管理
  const CACHE_KEY = `tx_cache_${address}_${chainId}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5分钟
  
  // 从缓存读取
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };
  
  // 保存到缓存
  const saveToCache = (data: Transfer[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch {
      // 缓存失败不影响功能
    }
  };
  
  // 解析 input data
  const parseInputData = (input: `0x${string}`): Transfer['parsedData'] => {
    if (!input || input === '0x' || input.length <= 2) {
      return { type: 'empty', content: '无数据' };
    }
    
    try {
      const text = hexToString(input);
      if (/^[\x20-\x7E\u4e00-\u9fa5]+$/.test(text)) {
        return { type: 'text', content: text };
      }
    } catch {}
    
    if (input.length >= 10) {
      const selector = input.slice(0, 10);
      const knownSelectors: Record<string, string> = {
        '0xa9059cbb': 'transfer(address,uint256)',
        '0x095ea7b3': 'approve(address,uint256)',
        '0x23b872dd': 'transferFrom(address,address,uint256)',
      };
      
      if (knownSelectors[selector]) {
        return { type: 'contract', content: knownSelectors[selector] };
      }
      
      return { type: 'contract', content: `合约调用: ${selector}...` };
    }
    
    return { 
      type: 'hex', 
      content: input.length > 66 ? `${input.slice(0, 66)}...` : input 
    };
  };
  
  // 加载交易历史（排除合约交易）
  const loadTransfers = async () => {
    if (!address) return;
    
    // 先尝试从缓存加载
    const cached = loadFromCache();
    if (cached) {
      setTransfers(cached);
      setDataSource('loaded');
      console.log('📦 从缓存加载了交易历史');
      return;
    }
    
    setLoading(true);
    setError(null);
    setDataSource('loading');
    
    try {
      // 检查 Alchemy 配置
      const alchemyStatus = getAlchemyStatus();
      if (!alchemyStatus.isConfigured) {
        setError('⚠️ 需要配置 Alchemy API Key 来查看其他交易');
        setDataSource('none');
        return;
      }
      
      // 获取交易数据
      const transferData = await getAssetTransfers(address);
      
      // 过滤掉与我们合约相关的交易
      const filteredTransfers = transferData.filter((tx: any) => {
        // 排除与我们合约的交互
        if (tx.to?.toLowerCase() === OUR_CONTRACT || 
            tx.from?.toLowerCase() === OUR_CONTRACT) {
          return false;
        }
        return true;
      });
      
      // 增强数据（仅对前10笔交易）
      const enhancedTransfers = await Promise.all(
        filteredTransfers.slice(0, 10).map(async (transfer: any) => {
          try {
            if (transfer.category === 'external') {
              const tx = await publicClient?.getTransaction({ 
                hash: transfer.hash as `0x${string}` 
              });
              
              if (tx?.input && tx.input !== '0x') {
                const parsedData = parseInputData(tx.input);
                return { ...transfer, inputData: tx.input, parsedData };
              }
            }
            return transfer;
          } catch {
            return transfer;
          }
        })
      );
      
      // 合并处理过的和未处理的
      const allTransfers = [
        ...enhancedTransfers,
        ...filteredTransfers.slice(10)
      ];
      
      setTransfers(allTransfers as Transfer[]);
      saveToCache(allTransfers as Transfer[]);
      setDataSource('loaded');
      
      console.log(`✅ 加载了 ${allTransfers.length} 笔其他交易`);
    } catch (error) {
      console.error('Failed to load transfers:', error);
      setError('加载交易历史失败');
      setDataSource('none');
    } finally {
      setLoading(false);
    }
  };
  
  // 过滤交易
  const getFilteredTransfers = () => {
    let filtered = transfers;
    
    switch (filter) {
      case 'transfers':
        return filtered.filter(tx => tx.category === 'external');
      case 'with-data':
        return filtered.filter(tx => tx.inputData && tx.inputData !== '0x');
      case 'tokens':
        return filtered.filter(tx => tx.category === 'erc20' || tx.category === 'erc721');
      default:
        return filtered;
    }
  };
  
  const displayTransfers = getFilteredTransfers().slice(0, showCount);
  
  // 格式化辅助函数
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  const getTransferType = (tx: Transfer) => {
    if (tx.from.toLowerCase() === address?.toLowerCase()) {
      return { label: '发送', color: 'text-red-600', bg: 'bg-red-50' };
    }
    return { label: '接收', color: 'text-green-600', bg: 'bg-green-50' };
  };
  
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      'external': { text: 'ETH', color: 'bg-blue-100 text-blue-700' },
      'internal': { text: '内部', color: 'bg-purple-100 text-purple-700' },
      'erc20': { text: 'ERC20', color: 'bg-green-100 text-green-700' },
      'erc721': { text: 'NFT', color: 'bg-pink-100 text-pink-700' },
    };
    return labels[category] || { text: category, color: 'bg-gray-100 text-gray-700' };
  };
  
  if (!isConnected) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">其他交易历史</h2>
        <p className="text-gray-500 text-center py-8">
          请先连接钱包查看交易历史
        </p>
      </div>
    );
  }
  
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">其他交易历史</h2>
          <p className="text-xs text-gray-500 mt-1">
            不包含本系统合约的交易
          </p>
        </div>
        
        {dataSource === 'none' && (
          <button
            onClick={loadTransfers}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            加载交易历史
          </button>
        )}
        
        {dataSource === 'loaded' && (
          <button
            onClick={loadTransfers}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            🔄 刷新
          </button>
        )}
      </div>
      
      {/* 提示信息 */}
      {dataSource === 'none' && !error && (
        <div className="text-center py-12 text-gray-500">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm mb-2">查看链上的其他交易活动</p>
          <p className="text-xs text-gray-400 mb-4">
            ETH 转账、代币交易、NFT 转移等
          </p>
          <button
            onClick={loadTransfers}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            加载交易历史
          </button>
          <p className="text-xs text-amber-600 mt-4">
            💡 提示：加载交易历史会消耗 Alchemy API 配额
          </p>
        </div>
      )}
      
      {/* 加载中 */}
      {dataSource === 'loading' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2 text-sm">加载交易记录...</p>
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
          {error.includes('Alchemy') && (
            <div className="mt-2">
              <a 
                href="https://dashboard.alchemy.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs underline"
              >
                获取免费的 Alchemy API Key →
              </a>
            </div>
          )}
        </div>
      )}
      
      {/* 筛选器 */}
      {dataSource === 'loaded' && transfers.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部 ({transfers.length})
            </button>
            <button
              onClick={() => setFilter('transfers')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === 'transfers' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ETH ({transfers.filter(tx => tx.category === 'external').length})
            </button>
            <button
              onClick={() => setFilter('tokens')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === 'tokens' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              代币 ({transfers.filter(tx => tx.category === 'erc20' || tx.category === 'erc721').length})
            </button>
            <button
              onClick={() => setFilter('with-data')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === 'with-data' 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              带数据 ({transfers.filter(tx => tx.inputData && tx.inputData !== '0x').length})
            </button>
          </div>
          
          {/* 交易列表 */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {displayTransfers.map((tx) => {
              const type = getTransferType(tx);
              const category = getCategoryLabel(tx.category);
              
              return (
                <div
                  key={tx.hash}
                  className={`p-3 rounded-lg border transition-all ${type.bg} border-gray-200`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${type.color}`}>
                        {type.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${category.color}`}>
                        {category.text}
                      </span>
                      {tx.parsedData?.type === 'text' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                          📝 备注
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {tx.metadata?.blockTimestamp && formatTime(tx.metadata.blockTimestamp)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {tx.value !== null && (
                      <p className="font-medium">
                        {tx.value} {tx.asset || 'ETH'}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>从: {formatAddress(tx.from)}</span>
                      <span>→</span>
                      <span>到: {formatAddress(tx.to)}</span>
                    </div>
                    
                    {tx.parsedData?.type === 'text' && (
                      <p className="text-xs text-gray-700 mt-2 p-2 bg-white bg-opacity-50 rounded">
                        备注: {tx.parsedData.content}
                      </p>
                    )}
                  </div>
                  
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    查看详情 ↗
                  </a>
                </div>
              );
            })}
          </div>
          
          {/* 加载更多 */}
          {displayTransfers.length < getFilteredTransfers().length && (
            <button
              onClick={() => setShowCount(prev => prev + 10)}
              className="w-full mt-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              显示更多（还有 {getFilteredTransfers().length - displayTransfers.length} 笔）
            </button>
          )}
          
          {/* 统计信息 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-600">
              <span>共 {transfers.length} 笔交易</span>
              <span>缓存时间: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
