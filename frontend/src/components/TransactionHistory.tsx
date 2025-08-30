import { useState, useEffect } from 'react';
import { useAccount, useChainId, usePublicClient, useReadContract } from 'wagmi';
import { formatEther, hexToString, parseAbiItem } from 'viem';
import { getAssetTransfers, getAlchemyStatus } from '../services/alchemy';
import { getContractAddress, DataLoggerABI } from '../config/contracts';
import { getDeployBlock } from '../config';

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
  // 增强字段
  inputData?: `0x${string}`;
  parsedData?: {
    type: 'empty' | 'text' | 'contract' | 'hex';
    content: string;
  };
  gasUsed?: string;
  isContractInteraction?: boolean;
}

interface ContractEvent {
  type: 'DataStored' | 'TransactionLogged';
  hash: string;
  from: string;
  to?: string;
  category?: string;
  data?: string;
  memo?: string;
  amount?: bigint;
  timestamp: bigint;
  blockNumber: bigint;
}

type FilterType = 'all' | 'transfers' | 'with-data' | 'logs';

export function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [contractEvents, setContractEvents] = useState<ContractEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 获取当前链的合约地址
  const contractAddress = getContractAddress(chainId);
  const OUR_CONTRACT = contractAddress?.toLowerCase() || '';
  const deployBlock = getDeployBlock(chainId);

  // 解析 input data
  const parseInputData = (input: `0x${string}`): Transfer['parsedData'] => {
    if (!input || input === '0x' || input.length <= 2) {
      return { type: 'empty', content: '无数据' };
    }
    
    try {
      // 尝试解析为 UTF-8 文本
      const text = hexToString(input);
      if (/^[\x20-\x7E\u4e00-\u9fa5]+$/.test(text)) {
        return { type: 'text', content: text };
      }
    } catch {
      // 解析失败，继续其他检查
    }
    
    // 检查是否是合约调用（4字节函数选择器）
    if (input.length >= 10) {
      const selector = input.slice(0, 10);
      
      // 我们合约的方法
      const ourMethods: Record<string, string> = {
        '0x5c36d25e': '📝 日志上传 (logData)',
        '0x4d8a9958': '💰 合约转账 (logWithPayment)',
      };
      
      // 其他常见方法
      const knownSelectors: Record<string, string> = {
        '0xa9059cbb': 'transfer(address,uint256)',
        '0x095ea7b3': 'approve(address,uint256)',
        '0x23b872dd': 'transferFrom(address,address,uint256)',
      };
      
      if (ourMethods[selector]) {
        return { 
          type: 'contract', 
          content: ourMethods[selector]
        };
      }
      
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
    
    // 默认显示为 hex
    return { 
      type: 'hex', 
      content: input.length > 66 ? `${input.slice(0, 66)}...` : input 
    };
  };

  // 加载合约事件
  const loadContractEvents = async () => {
    if (!contractAddress || !publicClient || !address) return;
    
    try {
      const fromBlock = BigInt(deployBlock || 0);
      const toBlock = 'latest';
      
      // 查询 DataStored 事件
      const dataStoredLogs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event DataStored(uint256 indexed recordId, address indexed sender, string indexed category, string data, uint256 timestamp)'),
        fromBlock,
        toBlock,
        args: {
          sender: address as `0x${string}`
        }
      });
      
      // 查询 TransactionLogged 事件
      const transactionLoggedLogs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event TransactionLogged(uint256 indexed recordId, address indexed from, address indexed to, uint256 amount, string memo, uint256 timestamp)'),
        fromBlock,
        toBlock,
        args: {
          from: address as `0x${string}`
        }
      });
      
      // 也查询接收的转账
      const receivedLogs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: parseAbiItem('event TransactionLogged(uint256 indexed recordId, address indexed from, address indexed to, uint256 amount, string memo, uint256 timestamp)'),
        fromBlock,
        toBlock,
        args: {
          to: address as `0x${string}`
        }
      });
      
      // 转换为统一格式
      const events: ContractEvent[] = [];
      
      // 处理 DataStored 事件
      dataStoredLogs.forEach(log => {
        events.push({
          type: 'DataStored',
          hash: log.transactionHash,
          from: log.args.sender as string,
          category: log.args.category as string,
          data: log.args.data as string,
          timestamp: log.args.timestamp as bigint,
          blockNumber: log.blockNumber
        });
      });
      
      // 处理 TransactionLogged 事件
      [...transactionLoggedLogs, ...receivedLogs].forEach(log => {
        events.push({
          type: 'TransactionLogged',
          hash: log.transactionHash,
          from: log.args.from as string,
          to: log.args.to as string,
          amount: log.args.amount as bigint,
          memo: log.args.memo as string,
          timestamp: log.args.timestamp as bigint,
          blockNumber: log.blockNumber
        });
      });
      
      // 按时间排序并去重
      const uniqueEvents = events.filter((event, index, self) =>
        index === self.findIndex((e) => e.hash === event.hash && e.type === event.type)
      );
      
      uniqueEvents.sort((a, b) => Number(b.timestamp - a.timestamp));
      
      setContractEvents(uniqueEvents);
      console.log(`✅ 加载了 ${uniqueEvents.length} 个合约事件`);
    } catch (error) {
      console.error('Failed to load contract events:', error);
    }
  };

  // 加载交易历史（增强版）
  const loadTransfers = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 检查是否在支持的网络
      if (chainId !== 11155111) {
        setError('当前仅支持 Sepolia 测试网');
        return;
      }

      // 检查 Alchemy 配置
      const alchemyStatus = getAlchemyStatus();
      if (!alchemyStatus.isConfigured) {
        setError('⚠️ Alchemy API Key 未配置，请在 frontend/.env 中设置 VITE_ALCHEMY_KEY');
        console.log('🔗 获取免费 API Key: https://dashboard.alchemy.com/');
        // 即使没有 Alchemy，也尝试加载合约事件
        await loadContractEvents();
        return;
      }

      // 并行加载两种数据
      const [transferData] = await Promise.all([
        getAssetTransfers(address),
        loadContractEvents()
      ]);
      
      // 增强每笔交易的数据
      const enhancedTransfers = await Promise.all(
        transferData.map(async (transfer: any) => {
          try {
            // 只对 ETH 交易获取 input data
            if (transfer.category === 'external' || transfer.category === 'internal') {
              const tx = await publicClient?.getTransaction({ 
                hash: transfer.hash as `0x${string}` 
              });
              
              if (tx) {
                const parsedData = parseInputData(tx.input);
                return {
                  ...transfer,
                  inputData: tx.input,
                  parsedData,
                  isContractInteraction: tx.to ? await isContract(tx.to) : false
                };
              }
            }
            return transfer;
          } catch {
            // 如果获取失败，返回原始数据
            return transfer;
          }
        })
      );
      
      setTransfers(enhancedTransfers as Transfer[]);
    } catch (error) {
      console.error('Failed to load transfers:', error);
      setError('加载交易历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 检查地址是否是合约
  const isContract = async (address: string): Promise<boolean> => {
    try {
      const code = await publicClient?.getBytecode({ address: address as `0x${string}` });
      return code ? code !== '0x' : false;
    } catch {
      return false;
    }
  };
  
  // 过滤交易
  const getFilteredTransfers = () => {
    switch (filter) {
      case 'transfers':
        // 普通转账：ETH 转账
        return transfers.filter(tx => tx.category === 'external');
      case 'with-data':
        // 带备注：input data 不为空
        return transfers.filter(tx => 
          tx.inputData && tx.inputData !== '0x'
        );
      case 'logs':
        // 返回空数组，logs 会单独显示
        return [];
      default:
        return transfers;
    }
  };

  const filteredTransfers = getFilteredTransfers();

  // 格式化时间
  const formatTime = (timestamp: string | bigint) => {
    const time = typeof timestamp === 'bigint' ? Number(timestamp) * 1000 : timestamp;
    return new Date(time).toLocaleString('zh-CN');
  };

  // 格式化地址
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 获取交易类型标签
  const getTransferType = (tx: Transfer) => {
    if (tx.from.toLowerCase() === address?.toLowerCase()) {
      return { label: '发送', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    }
    return { label: '接收', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  // 获取分类标签
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      'external': { text: 'ETH', color: 'bg-blue-100 text-blue-700' },
      'internal': { text: '内部', color: 'bg-purple-100 text-purple-700' },
      'erc20': { text: 'ERC20', color: 'bg-green-100 text-green-700' },
      'erc721': { text: 'NFT', color: 'bg-pink-100 text-pink-700' },
      'erc1155': { text: 'ERC1155', color: 'bg-indigo-100 text-indigo-700' },
    };
    return labels[category] || { text: category, color: 'bg-gray-100 text-gray-700' };
  };

  // 获取 Etherscan 链接
  const getEtherscanUrl = (hash: string) => {
    if (chainId === 11155111) {
      return `https://sepolia.etherscan.io/tx/${hash}`;
    }
    return '#';
  };

  useEffect(() => {
    if (address && chainId === 11155111) {
      loadTransfers();
    }
  }, [address, chainId]);

  if (!isConnected) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">链上交易历史</h2>
        <p className="text-gray-500 text-center py-8">
          请先连接钱包查看交易历史
        </p>
      </div>
    );
  }

  if (chainId !== 11155111) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">链上交易历史</h2>
        <div className="text-center py-8">
          <p className="text-amber-600 mb-2">
            ⚠️ 请切换到 Sepolia 测试网
          </p>
          <p className="text-sm text-gray-500">
            交易历史功能需要 Alchemy API，当前仅支持 Sepolia 网络
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">链上交易历史</h2>
        <button
          onClick={loadTransfers}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
        >
          {loading ? '加载中...' : '🔄 刷新'}
        </button>
      </div>

      {/* 简化的筛选选项 */}
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
            全部 ({transfers.length + contractEvents.length})
          </button>
          <button
            onClick={() => setFilter('logs')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'logs' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📝 合约记录 ({contractEvents.length})
          </button>
          <button
            onClick={() => setFilter('transfers')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'transfers' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💸 普通转账 ({transfers.filter(tx => tx.category === 'external').length})
          </button>
          <button
            onClick={() => setFilter('with-data')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'with-data' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📎 带备注 ({transfers.filter(tx => tx.inputData && tx.inputData !== '0x').length})
          </button>
        </div>
        
        {filter === 'logs' && (
          <p className="text-xs text-purple-600 mt-2">
            💡 显示通过合约 logData 和 logWithPayment 方法上传的数据
          </p>
        )}
        {filter === 'transfers' && (
          <p className="text-xs text-blue-600 mt-2">
            💡 显示普通的 ETH 转账记录
          </p>
        )}
        {filter === 'with-data' && (
          <p className="text-xs text-amber-600 mt-2">
            💡 显示包含 input data 的交易（如带备注的转账）
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
          {error}
          {error.includes('Alchemy') && (
            <div className="mt-2">
              <p className="text-xs">👉 配置步骤：</p>
              <ol className="list-decimal list-inside text-xs mt-1 space-y-1">
                <li>访问 <a href="https://dashboard.alchemy.com/" target="_blank" rel="noopener noreferrer" className="underline">Alchemy Dashboard</a></li>
                <li>注册并创建新应用（选择 Sepolia 网络）</li>
                <li>复制 API Key</li>
                <li>在 <code className="bg-gray-200 px-1 rounded">frontend/.env</code> 中设置：<br/>
                   <code className="bg-gray-200 px-1 rounded">VITE_ALCHEMY_KEY=你的API_Key</code>
                </li>
                <li>重启开发服务器</li>
              </ol>
              <p className="text-xs mt-2 text-amber-700">
                ℹ️ 即使没有 Alchemy，仍可查看合约记录（点击"合约记录"标签）
              </p>
            </div>
          )}
        </div>
      )}

      {/* 交易列表 */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2 text-sm">加载交易记录...</p>
          </div>
        ) : filter === 'logs' ? (
          // 显示合约事件
          contractEvents.length > 0 ? (
            contractEvents.map((event) => (
              <div
                key={`${event.hash}-${event.type}`}
                className={`p-3 rounded-lg border transition-all ${
                  event.type === 'DataStored' 
                    ? 'bg-purple-50 border-purple-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      event.type === 'DataStored' ? 'text-purple-600' : 'text-green-600'
                    }`}>
                      {event.type === 'DataStored' ? '📝 日志上传' : '💰 合约转账'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      合约事件
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  {event.type === 'DataStored' ? (
                    <>
                      <p className="text-gray-700">
                        <span className="text-gray-500">分类:</span> {event.category}
                      </p>
                      <p className="text-gray-700 break-all">
                        <span className="text-gray-500">数据:</span> {event.data}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        {formatEther(event.amount!)} ETH
                      </p>
                      <p className="text-gray-700 break-all">
                        <span className="text-gray-500">备注:</span> {event.memo}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>从: {formatAddress(event.from)}</span>
                        <span>→</span>
                        <span>到: {formatAddress(event.to!)}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      区块: {event.blockNumber.toString()}
                    </span>
                    <a
                      href={getEtherscanUrl(event.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      查看交易 ↗
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">暂无合约记录</p>
              <p className="text-sm text-gray-400">
                使用"日志方式"或"合约转账"上传数据后会显示在这里
              </p>
            </div>
          )
        ) : filter === 'all' ? (
          // 合并显示所有记录
          <>
            {/* 先显示合约事件 */}
            {contractEvents.map((event) => (
              <div
                key={`event-${event.hash}-${event.type}`}
                className={`p-3 rounded-lg border transition-all ${
                  event.type === 'DataStored' 
                    ? 'bg-purple-50 border-purple-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      event.type === 'DataStored' ? 'text-purple-600' : 'text-green-600'
                    }`}>
                      {event.type === 'DataStored' ? '📝 日志上传' : '💰 合约转账'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      合约事件
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  {event.type === 'DataStored' ? (
                    <p className="text-gray-700 break-all">
                      <span className="text-gray-500">数据:</span> {event.data}
                    </p>
                  ) : (
                    <p className="font-medium">
                      {formatEther(event.amount!)} ETH - {event.memo}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {/* 再显示普通交易 */}
            {filteredTransfers.map((tx) => {
              const type = getTransferType(tx);
              const category = getCategoryLabel(tx.category);
              const isExpanded = expandedTx === tx.hash;
              
              return (
                <div
                  key={`tx-${tx.hash}`}
                  className={`p-3 rounded-lg border transition-all ${type.bg} ${type.border} ${
                    isExpanded ? 'ring-2 ring-blue-400' : ''
                  }`}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedTx(isExpanded ? null : tx.hash)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${type.color}`}>
                          {type.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${category.color}`}>
                          {category.text}
                        </span>

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
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          // 显示筛选后的普通交易
          filteredTransfers.length > 0 ? (
            filteredTransfers.map((tx) => {
              const type = getTransferType(tx);
              const category = getCategoryLabel(tx.category);
              const isExpanded = expandedTx === tx.hash;
              
              return (
                <div
                  key={tx.hash}
                  className={`p-3 rounded-lg border transition-all ${type.bg} ${type.border} ${
                    isExpanded ? 'ring-2 ring-blue-400' : ''
                  }`}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedTx(isExpanded ? null : tx.hash)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${type.color}`}>
                          {type.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${category.color}`}>
                          {category.text}
                        </span>
                        {tx.isContractInteraction && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            合约
                          </span>
                        )}
                        {tx.to && tx.to.toLowerCase() === OUR_CONTRACT && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            🔗 合约交易
                          </span>
                        )}
                        {tx.inputData && tx.inputData !== '0x' && (
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
                    </div>
                  </div>

                  {/* 展开的详细信息 */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {/* Input Data 解析 */}
                      {tx.inputData && tx.inputData !== '0x' && tx.parsedData && (
                        <div className="mb-3 p-3 bg-white bg-opacity-50 rounded">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-gray-700">数据:</span>
                            <div className="flex-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs mb-1 ${
                                tx.parsedData.type === 'text' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : tx.parsedData.type === 'contract'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {tx.parsedData.type === 'text' ? '文本' : 
                                 tx.parsedData.type === 'contract' ? '合约调用' : 
                                 'Hex 数据'}
                              </span>
                              <p className="text-xs break-all text-gray-800 mt-1">
                                {tx.parsedData.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <a
                        href={getEtherscanUrl(tx.hash)}
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
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">
                {filter === 'with-data' 
                  ? '暂无带数据的交易' 
                  : '暂无交易记录'}
              </p>
              <p className="text-sm text-gray-400">
                进行交易后会显示在这里
              </p>
            </div>
          )
        )}
      </div>

      {/* 统计信息 */}
      {(transfers.length > 0 || contractEvents.length > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
            <div>
              <span className="block text-gray-500">合约记录</span>
              <span className="text-lg font-semibold text-purple-700">
                {contractEvents.length}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">ETH转账</span>
              <span className="text-lg font-semibold text-blue-700">
                {transfers.filter(tx => tx.category === 'external').length}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">带备注</span>
              <span className="text-lg font-semibold text-amber-700">
                {transfers.filter(tx => tx.inputData && tx.inputData !== '0x').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
