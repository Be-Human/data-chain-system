import { useEffect, useState } from 'react';
import { useChainId, useBlockNumber, useReadContract } from 'wagmi';
import { getContractConfig, DataLoggerABI } from '../config/contracts';
import { getChainConfig, getExplorerUrl, APP_CONFIG } from '../config';
import { getProviderStatus, switchProvider } from '../config/provider';
import type { ProviderType } from '../config/provider';
import { isBlockWatchingEnabled } from '../config/autoRefresh';
import { formatEther } from 'viem';

interface ContractStatus {
  isDeployed: boolean;
  currentBlock?: bigint;
  deployBlock?: number;
  totalRecords?: { data: bigint; tx: bigint };
  chainName?: string;
  explorerUrl?: string;
}

export function ContractStatus() {
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ 
    watch: isBlockWatchingEnabled() // 使用自动刷新设置
  });
  const [status, setStatus] = useState<ContractStatus>({ isDeployed: false });
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  
  const contractConfig = getContractConfig(chainId);
  const chainConfig = getChainConfig(chainId);
  const providerStatus = getProviderStatus();
  // 处理 Provider 切换
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ProviderType;
    if (newProvider !== providerStatus.provider) {
      if (confirm(`切换到 ${newProvider === 'auto' ? '自动选择' : newProvider.toUpperCase()} 会刷新页面，确定吗？`)) {
        switchProvider(newProvider);
      }
    }
  };
  
  // 读取合约记录统计
  const { data: recordCounts } = useReadContract({
    address: contractConfig?.address,
    abi: DataLoggerABI,
    functionName: 'getRecordCounts',
  });
  
  useEffect(() => {
    const newStatus: ContractStatus = {
      isDeployed: !!contractConfig?.address,
      currentBlock: blockNumber,
      deployBlock: contractConfig?.deployBlock,
      chainName: chainConfig?.name,
      explorerUrl: contractConfig?.address ? 
        getExplorerUrl(chainId, 'address', contractConfig.address) : 
        undefined
    };
    
    if (recordCounts) {
      newStatus.totalRecords = {
        data: recordCounts[0],
        tx: recordCounts[1]
      };
    }
    
    setStatus(newStatus);
  }, [chainId, blockNumber, contractConfig?.address, contractConfig?.deployBlock, chainConfig?.name, recordCounts?.[0]?.toString(), recordCounts?.[1]?.toString()]);
  
  // 如果没有部署合约，显示提示
  if (!status.isDeployed) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              合约未部署
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>当前链 {status.chainName || `(Chain ID: ${chainId})`} 上未检测到合约。</p>
              {chainConfig?.testnet && (
                <p className="mt-1">请确保已在该测试网上部署合约。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          🔗 合约状态
        </h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          已部署
        </span>
      </div>
      
      {/* Provider 选择器 */}
      <div className="mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">RPC Provider:</span>
            <span className="text-xs font-medium text-gray-900">
              {providerStatus.name}
            </span>
            {providerStatus.hasApiKey && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                ✓
              </span>
            )}
          </div>
          <button
            onClick={() => setShowProviderSelector(!showProviderSelector)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            切换
          </button>
        </div>
        
        {showProviderSelector && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <select
              value={providerStatus.provider}
              onChange={handleProviderChange}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              {providerStatus.available.map(p => (
                <option key={p.type} value={p.type}>
                  {p.name} {p.current && '(当前)'}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-600">
              {providerStatus.provider === 'alchemy' && (
                <div>
                  <p className="font-medium">💪 Alchemy 特性：</p>
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>• 交易历史查询</li>
                    <li>• 增强的 API 功能</li>
                    <li>• WebSocket 支持</li>
                  </ul>
                </div>
              )}
              {providerStatus.provider === 'infura' && (
                <div>
                  <p className="font-medium">🌐 Infura 特性：</p>
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>• 稳定的 RPC 服务</li>
                    <li>• IPFS 支持</li>
                    <li>• 多链支持</li>
                  </ul>
                </div>
              )}
              {providerStatus.provider === 'auto' && (
                <p className="text-amber-600">
                  ⚠️ 使用公共 RPC，可能速度较慢
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-2 text-xs">
        {/* 链信息 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500">网络</span>
          <span className="font-medium text-gray-900">
            {status.chainName} {chainConfig?.testnet && '(测试网)'}
          </span>
        </div>
        
        {/* 合约地址 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500">合约地址</span>
          <a 
            href={status.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-blue-600 hover:text-blue-700"
          >
            {contractConfig?.address?.slice(0, 6)}...{contractConfig?.address?.slice(-4)}
          </a>
        </div>
        
        {/* 部署区块 */}
        {status.deployBlock && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">部署区块</span>
            <span className="font-medium text-gray-900">
              #{status.deployBlock.toLocaleString()}
            </span>
          </div>
        )}
        
        {/* 当前区块 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500">当前区块</span>
          <span className="font-medium text-gray-900">
            #{status.currentBlock?.toString() || '-'}
          </span>
        </div>
        
        {/* 记录统计 */}
        {status.totalRecords && (
          <>
            <div className="pt-2 mt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">数据记录</span>
                <span className="font-medium text-gray-900">
                  {status.totalRecords.data.toString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-500">转账记录</span>
                <span className="font-medium text-gray-900">
                  {status.totalRecords.tx.toString()}
                </span>
              </div>
            </div>
          </>
        )}
        
        {/* 配置模式 */}
        {APP_CONFIG.debug && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">调试模式</span>
              <span className="text-green-600">✓ 启用</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 功能状态 */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex gap-2 flex-wrap">
          {providerStatus.features.enhanced && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
              增强 API
            </span>
          )}
          {providerStatus.features.assetTransfers && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
              交易查询
            </span>
          )}
          {APP_CONFIG.features.enableGraph && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
              Graph
            </span>
          )}
        </div>
        
        {providerStatus.limits && (
          <div className="mt-2 text-xs text-gray-500">
            限额：
            {providerStatus.limits.requests && (
              <span>{providerStatus.limits.requests.toLocaleString()} 请求/</span>
            )}
            {providerStatus.limits.compute && (
              <span>{(providerStatus.limits.compute / 1000000).toFixed(0)}M 计算单元/</span>
            )}
            {providerStatus.limits.period}
          </div>
        )}
      </div>
    </div>
  );
}
