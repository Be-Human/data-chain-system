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
  // 新增字段来标识交易类型
  transactionType?: 'our-contract' | 'other-contract' | 'normal' | 'token';
  contractMethod?: string;
}

type FilterType = 'all' | 'our-contract' | 'other-contracts' | 'normal' | 'tokens' | 'with-data';
type DataSource = 'none' | 'loading' | 'loaded';

export function TransactionHistoryUnified() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('none');
  const [showCount, setShowCount] = useState(20);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  
  // 获取合约地址
  const contractAddress = getContractAddress(chainId);
  const OUR_CONTRACT = contractAddress?.toLowerCase() || '';
  
  // 缓存管理
  const CACHE_KEY = `tx_cache_unified_${address}_${chainId}`;
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
  const parseInputData = (input: `0x${string}`, to?: string): Transfer['parsedData'] => {
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
      
      // 我们合约的方法
      if (to?.toLowerCase() === OUR_CONTRACT) {
        const ourMethods: Record<string, string> = {
          '0x5c36d25e': '📝 日志上传 (logData)',
          '0x4d8a9958': '💰 合约转账 (logWithPayment)',
        };
        
        if (ourMethods[selector]) {
          return { 
            type: 'contract', 
            content: ourMethods[selector]
          };
        }
      }
      
      // 其他常见合约方法
      const knownSelectors: Record<string, string> = {
        '0xa9059cbb': 'transfer(address,uint256)',
        '0x095ea7b3': 'approve(address,uint256)',
        '0x23b872dd': 'transferFrom(address,address,uint256)',
        '0x70a08231': 'balanceOf(address)',
        '0x18160ddd': 'totalSupply()',
      };
      
      if (knownSelectors[selector]) {
        return { 
          type: 'contract', 
          content: knownSelectors[selector]
        };
      }
      
      return { 
        type: 'contract', 
        content: `合约调用: ${selector}...` 
      };
    }
    
    return { 
      type: 'hex', 
      content: input.length > 66 ? `${input.slice(0, 66)}...` : input 
    };
  };
  
  // 判断交易类型
  const getTransactionType = (tx: any): Transfer['transactionType'] => {
    // 我们的合约
    if (tx.to?.toLowerCase() === OUR_CONTRACT || tx.from?.toLowerCase() === OUR_CONTRACT) {
      return 'our-contract';
    }
    
    // 代币交易
    if (tx.category === 'erc20' || tx.category === 'erc721' || tx.category === 'erc1155') {
      return 'token';
    }
    
    // 其他合约交互（通过 input data 判断）
    if (tx.inputData && tx.inputData !== '0x' && tx.inputData.length >= 10) {
      return 'other-contract';
    }
    
    // 普通转账
    return 'normal';
  };
  
  // 加载交易历史
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
        setError('⚠️ 需要配置 Alchemy API Key 来查看交易历史');
        setDataSource('none');
        return;
      }
      
      // 获取所有交易数据（包括发送和接收）
      const sentData = await getAssetTransfers(address);
      
      // 合并去重（getAssetTransfers 已经包含了接收的交易）
      const uniqueTransfers = sentData;
      
      // 增强交易数据
      const enhancedTransfers = await Promise.all(
        uniqueTransfers.slice(0, 50).map(async (transfer: any) => {
          try {
            // 获取交易类型
            const transactionType = getTransactionType(transfer);
            
            // 对于 ETH 交易，获取 input data
            if (transfer.category === 'external' || transfer.category === 'internal') {
              const tx = await publicClient?.getTransaction({ 
                hash: transfer.hash as `0x${string}` 
              });
              
              if (tx?.input) {
                const parsedData = parseInputData(tx.input, transfer.to);
                return {
                  ...transfer,
                  inputData: tx.input,
                  parsedData,
                  transactionType,
                  contractMethod: parsedData.type === 'contract' ? parsedData.content : undefined
                };
              }
            }
            
            return {
              ...transfer,
              transactionType
            };
          } catch {
            return {
              ...transfer,
              transactionType: getTransactionType(transfer)
            };
          }
        })
      );
      
      // 按时间排序
      enhancedTransfers.sort((a, b) => {
        const timeA = new Date(a.metadata?.blockTimestamp || 0).getTime();
        const timeB = new Date(b.metadata?.blockTimestamp || 0).getTime();
        return timeB - timeA;
      });
      
      setTransfers(enhancedTransfers as Transfer[]);
      saveToCache(enhancedTransfers as Transfer[]);
      setDataSource('loaded');
      
      console.log(`✅ 加载了 ${enhancedTransfers.length} 笔交易`);
      
      // 统计不同类型的交易
      const stats = {
        ourContract: enhancedTransfers.filter(tx => tx.transactionType === 'our-contract').length,
        otherContracts: enhancedTransfers.filter(tx => tx.transactionType === 'other-contract').length,
        normal: enhancedTransfers.filter(tx => tx.transactionType === 'normal').length,
        tokens: enhancedTransfers.filter(tx => tx.transactionType === 'token').length,
      };
      console.log('📊 交易统计:', stats);
      
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
    switch (filter) {
      case 'our-contract':
        return transfers.filter(tx => tx.transactionType === 'our-contract');
      case 'other-contracts':
        return transfers.filter(tx => tx.transactionType === 'other-contract');
      case 'normal':
        return transfers.filter(tx => tx.transactionType === 'normal');
      case 'tokens':
        return transfers.filter(tx => tx.transactionType === 'token');
      case 'with-data':
        return transfers.filter(tx => tx.inputData && tx.inputData !== '0x');
      default:
        return transfers;
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
  
  // 获取交易方向
  const getTransferDirection = (tx: Transfer) => {
    if (tx.from.toLowerCase() === address?.toLowerCase()) {
      return { label: '发送', color: 'text-red-600', bg: 'bg-red-50' };
    }
    return { label: '接收', color: 'text-green-600', bg: 'bg-green-50' };
  };
  
  // 获取分类标签
  const getCategoryLabel = (tx: Transfer) => {
    // 优先显示我们的合约
    if (tx.transactionType === 'our-contract') {
      if (tx.contractMethod?.includes('日志上传')) {
        return { text: '📝 系统-日志', color: 'bg-purple-100 text-purple-700' };
      }
      if (tx.contractMethod?.includes('合约转账')) {
        return { text: '💰 系统-转账', color: 'bg-indigo-100 text-indigo-700' };
      }
      return { text: '🔗 系统合约', color: 'bg-blue-100 text-blue-700' };
    }
    
    // 其他分类
    const labels: Record<string, { text: string; color: string }> = {
      'erc20': { text: 'ERC20', color: 'bg-green-100 text-green-700' },
      'erc721': { text: 'NFT', color: 'bg-pink-100 text-pink-700' },
      'erc1155': { text: 'ERC1155', color: 'bg-yellow-100 text-yellow-700' },
      'internal': { text: '内部', color: 'bg-gray-100 text-gray-700' },
      'external': tx.transactionType === 'other-contract' 
        ? { text: '合约交互', color: 'bg-orange-100 text-orange-700' }
        : { text: 'ETH', color: 'bg-blue-100 text-blue-700' },
    };
    
    return labels[tx.category] || { text: tx.category, color: 'bg-gray-100 text-gray-700' };
  };
  
  if (!isConnected) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">交易历史</h2>
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
          <h2 className="text-lg font-semibold">交易历史</h2>
          <p className="text-xs text-gray-500 mt-1">
            包含所有链上交易记录
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
          <p className="text-sm mb-2">查看所有链上交易活动</p>
          <p className="text-xs text-gray-400 mb-4">
            包括本系统合约、其他合约交互、普通转账等
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
        </div>
      )}
      
      {/* 筛选器 */}
      {dataSource === 'loaded' && transfers.length > 0 && (
        <>
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
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
              
              {transfers.filter(tx => tx.transactionType === 'our-contract').length > 0 && (
                <button
                  onClick={() => setFilter('our-contract')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === 'our-contract' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🔗 合约交易 ({transfers.filter(tx => tx.transactionType === 'our-contract').length})
                </button>
              )}
              
              <button
                onClick={() => setFilter('normal')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === 'normal' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                💸 普通转账 ({transfers.filter(tx => tx.transactionType === 'normal').length})
              </button>
              
              {transfers.filter(tx => tx.transactionType === 'other-contract').length > 0 && (
                <button
                  onClick={() => setFilter('other-contracts')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === 'other-contracts' 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📦 其他合约 ({transfers.filter(tx => tx.transactionType === 'other-contract').length})
                </button>
              )}
              
              {transfers.filter(tx => tx.transactionType === 'token').length > 0 && (
                <button
                  onClick={() => setFilter('tokens')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === 'tokens' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🪙 代币 ({transfers.filter(tx => tx.transactionType === 'token').length})
                </button>
              )}
              
              {transfers.filter(tx => tx.inputData && tx.inputData !== '0x').length > 0 && (
                <button
                  onClick={() => setFilter('with-data')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === 'with-data' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📎 带数据 ({transfers.filter(tx => tx.inputData && tx.inputData !== '0x').length})
                </button>
              )}
            </div>
            
            {/* 筛选说明 */}
            {filter === 'our-contract' && (
              <p className="text-xs text-purple-600 mt-2">
                💡 显示通过本系统合约的交易（logData 和 logWithPayment）
              </p>
            )}
            {filter === 'normal' && (
              <p className="text-xs text-blue-600 mt-2">
                💡 显示普通的 ETH 转账，不涉及合约调用
              </p>
            )}
            {filter === 'other-contracts' && (
              <p className="text-xs text-orange-600 mt-2">
                💡 显示与其他智能合约的交互
              </p>
            )}
          </div>
          
          {/* 交易列表 */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {displayTransfers.map((tx) => {
              const direction = getTransferDirection(tx);
              const category = getCategoryLabel(tx);
              const isExpanded = expandedTx === tx.hash;
              const isOurContract = tx.transactionType === 'our-contract';
              
              return (
                <div
                  key={tx.hash}
                  className={`p-3 rounded-lg border transition-all ${
                    isOurContract 
                      ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200' 
                      : `${direction.bg} border-gray-200`
                  } ${isExpanded ? 'ring-2 ring-blue-400' : ''} hover:shadow-md`}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedTx(isExpanded ? null : tx.hash)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${direction.color}`}>
                          {direction.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${category.color}`}>
                          {category.text}
                        </span>
                        {tx.inputData && tx.inputData !== '0x' && !isOurContract && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            📎 数据
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {tx.metadata?.blockTimestamp && formatTime(tx.metadata.blockTimestamp)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {tx.value !== null && tx.value > 0 && (
                        <p className="font-medium">
                          {tx.value} {tx.asset || 'ETH'}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>从: {formatAddress(tx.from)}</span>
                        <span>→</span>
                        <span>
                          到: {tx.to.toLowerCase() === OUR_CONTRACT 
                            ? '🔗 本系统合约' 
                            : formatAddress(tx.to)}
                        </span>
                      </div>
                      
                      {/* 显示合约方法 */}
                      {tx.contractMethod && (
                        <p className="text-xs text-gray-700 mt-1">
                          方法: {tx.contractMethod}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 展开的详细信息 */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {/* 交易哈希 */}
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">交易哈希:</span>{' '}
                        <span className="font-mono">{tx.hash}</span>
                      </div>
                      
                      {/* Input Data 解析 */}
                      {tx.inputData && tx.inputData !== '0x' && tx.parsedData && (
                        <div className="mb-3 p-3 bg-white bg-opacity-50 rounded">
                          <div className="text-xs">
                            <p className="font-medium text-gray-700 mb-1">交易数据:</p>
                            <div className="bg-gray-50 p-2 rounded">
                              {tx.parsedData.type === 'text' ? (
                                <p className="text-gray-800 break-all">
                                  📝 文本: {tx.parsedData.content}
                                </p>
                              ) : tx.parsedData.type === 'contract' ? (
                                <p className="text-gray-800">
                                  🔧 {tx.parsedData.content}
                                </p>
                              ) : (
                                <p className="text-gray-600 font-mono text-xs break-all">
                                  {tx.parsedData.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 交易类型说明 */}
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">类型:</span>{' '}
                        {tx.transactionType === 'our-contract' && '本系统合约交易'}
                        {tx.transactionType === 'other-contract' && '其他合约交互'}
                        {tx.transactionType === 'normal' && '普通 ETH 转账'}
                        {tx.transactionType === 'token' && '代币交易'}
                      </div>

                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        在 Etherscan 查看 ↗
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 加载更多 */}
          {displayTransfers.length < getFilteredTransfers().length && (
            <button
              onClick={() => setShowCount(prev => prev + 20)}
              className="w-full mt-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              显示更多（还有 {getFilteredTransfers().length - displayTransfers.length} 笔）
            </button>
          )}
          
          {/* 统计信息 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="text-center">
                <span className="block text-gray-500">合约交易</span>
                <span className="text-lg font-semibold text-purple-700">
                  {transfers.filter(tx => tx.transactionType === 'our-contract').length}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-gray-500">普通转账</span>
                <span className="text-lg font-semibold text-blue-700">
                  {transfers.filter(tx => tx.transactionType === 'normal').length}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-gray-500">其他合约</span>
                <span className="text-lg font-semibold text-orange-700">
                  {transfers.filter(tx => tx.transactionType === 'other-contract').length}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-gray-500">代币</span>
                <span className="text-lg font-semibold text-green-700">
                  {transfers.filter(tx => tx.transactionType === 'token').length}
                </span>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">
              缓存时间: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
