import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { DataUploader } from './components/DataUploader';
import { DataDisplayEnhanced } from './components/DataDisplayEnhanced';
import { TransactionHistoryUnified } from './components/TransactionHistoryUnified';
import { TransferMethodComparison } from './components/TransferMethodComparison';
import { GraphDataDisplayOptimized } from './components/GraphDataDisplayOptimized';
import { ContractStatus } from './components/ContractStatus';
import { AutoRefreshControl } from './components/AutoRefreshControl';
import { useState, useEffect } from 'react';
import { useAccount, useBlockNumber, useChainId } from 'wagmi';
import { getContractAddress, getExplorerUrl, getChainConfig, APP_CONFIG } from './config';
import { isBlockWatchingEnabled } from './config/autoRefresh';

const queryClient = new QueryClient();

type MainTab = 'data-center' | 'graph' | 'guide';
type DataTab = 'contract-data' | 'transactions';

// 内部组件，可以使用 wagmi hooks
function AppContent() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('data-center');
  const [activeDataTab, setActiveDataTab] = useState<DataTab>('contract-data');
  const [lastUploadTime, setLastUploadTime] = useState<number>(0);
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ 
    watch: isBlockWatchingEnabled() // 使用自动刷新设置
  });
  const contractAddress = getContractAddress(chainId);
  const chainConfig = getChainConfig(chainId);
  
  // 监听区块变化，可能有新交易
  useEffect(() => {
    if (blockNumber) {
      // 触发数据刷新
      setLastUploadTime(Date.now());
    }
  }, [blockNumber]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                🔗 数据上链系统
              </h1>
              <span className="ml-3 text-sm text-gray-500">
                基于以太坊的数据存储方案
              </span>
            </div>
            <div>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 主导航 - 简化为三个 */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setActiveMainTab('data-center')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeMainTab === 'data-center'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 数据中心
            </button>
            <button
              onClick={() => setActiveMainTab('graph')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeMainTab === 'graph'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔮 The Graph
            </button>
            <button
              onClick={() => setActiveMainTab('guide')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeMainTab === 'guide'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📖 使用指南
            </button>
          </div>
        </div>

        {/* 数据中心页面 - 合并上传和查询 */}
        {activeMainTab === 'data-center' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 左侧：上传面板（调宽到 5/12） */}
            <div className="lg:col-span-5">
              <div className="sticky top-6">
                <DataUploader />
                
                {/* 合约状态 */}
                <div className="mt-4">
                  <ContractStatus />
                </div>
                
                {/* 自动刷新控制 */}
                <div className="mt-4">
                  <AutoRefreshControl />
                </div>
              </div>
            </div>

            {/* 右侧：数据展示区（7/12） */}
            <div className="lg:col-span-7">
              {/* 数据展示标签 */}
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">数据展示</h2>
                  {lastUploadTime > 0 && (
                    <span className="text-xs text-green-600">
                      ✓ 已更新
                    </span>
                  )}
                </div>
                
                {/* 子标签 - 简化为两个 */}
                <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setActiveDataTab('contract-data')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeDataTab === 'contract-data'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🔒 合约数据
                  </button>
                  <button
                    onClick={() => setActiveDataTab('transactions')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeDataTab === 'transactions'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ⚡ 交易历史
                  </button>
                </div>

                {/* 内容区域 */}
                {!isConnected ? (
                  <div className="text-center py-12 text-gray-500">
                    请先连接钱包查看数据
                  </div>
                ) : (
                  <>
                    {/* 合约数据 - 使用 display 控制显示/隐藏 */}
                    <div style={{ display: activeDataTab === 'contract-data' ? 'block' : 'none' }}>
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                          💡 显示通过智能合约永久存储的数据，包括日志方式和合约转账方式上传的内容
                        </p>
                      </div>
                      <DataDisplayEnhanced />
                    </div>

                    {/* 交易历史 - 使用 display 控制显示/隐藏 */}
                    <div style={{ display: activeDataTab === 'transactions' ? 'block' : 'none' }}>
                      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-700">
                          💡 显示所有链上交易记录，包括本系统合约、其他合约交互、普通转账等
                        </p>
                      </div>
                      <TransactionHistoryUnified />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* The Graph 页面 */}
        {activeMainTab === 'graph' && (
          <div>
            <GraphDataDisplayOptimized />
          </div>
        )}

        {/* 使用指南页面 */}
        {activeMainTab === 'guide' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 方案对比 */}
            <div className="lg:col-span-2">
              <TransferMethodComparison />
            </div>
            
            {/* 快速指南 */}
            <div className="space-y-4">
              {/* 快速开始 */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">🚀 快速开始</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">连接钱包</p>
                      <p className="text-xs text-gray-500">点击右上角连接 MetaMask</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">切换网络</p>
                      <p className="text-xs text-gray-500">选择 Sepolia 测试网</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">选择方式</p>
                      <p className="text-xs text-gray-500">根据需求选择上链方式</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                      4
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">上传数据</p>
                      <p className="text-xs text-gray-500">填写表单并确认交易</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 常见问题 */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">❓ 常见问题</h3>
                <div className="space-y-3">
                  <details className="group">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      如何获取测试 ETH？
                    </summary>
                    <p className="mt-2 text-xs text-gray-600 pl-4">
                      访问 Sepolia Faucet 网站，输入钱包地址即可免费领取测试 ETH。
                    </p>
                  </details>
                  <details className="group">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      数据会永久保存吗？
                    </summary>
                    <p className="mt-2 text-xs text-gray-600 pl-4">
                      是的，通过合约存储的数据会永久保存在区块链上。原生转账的 input data 也会永久记录在交易中。
                    </p>
                  </details>
                  <details className="group">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      Gas 费是多少？
                    </summary>
                    <p className="mt-2 text-xs text-gray-600 pl-4">
                      原生转账：21,000 Gas<br/>
                      日志方式：约 50,000 Gas<br/>
                      合约转账：约 80,000 Gas
                    </p>
                  </details>
                  <details className="group">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      支持哪些网络？
                    </summary>
                    <p className="mt-2 text-xs text-gray-600 pl-4">
                      当前支持 Sepolia 测试网。主网和其他 L2 网络即将支持。
                    </p>
                  </details>
                </div>
              </div>

              {/* 资源链接 */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">🔗 资源链接</h3>
                <div className="space-y-2">
                  <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer"
                     className="block p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    → Sepolia Etherscan
                  </a>
                  <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer"
                     className="block p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    → Sepolia Faucet
                  </a>
                  <a href="https://thegraph.com" target="_blank" rel="noopener noreferrer"
                     className="block p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    → The Graph Protocol
                  </a>
                  <a href="https://docs.alchemy.com" target="_blank" rel="noopener noreferrer"
                     className="block p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    → Alchemy Docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 底部信息 - 动态显示 */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-xs text-gray-500">
            {contractAddress ? (
              <>
                <p>
                  合约地址: 
                  <a 
                    href={getExplorerUrl(chainId, 'address', contractAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 ml-1"
                  >
                    {contractAddress}
                  </a>
                </p>
                <p className="mt-1">
                  网络: {chainConfig?.name} (Chain ID: {chainId})
                  {APP_CONFIG.features.enableAlchemy && ' | Powered by Alchemy'}
                  {APP_CONFIG.features.enableInfura && ' | Powered by Infura'}
                </p>
              </>
            ) : (
              <p>未检测到合约部署</p>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

// 主 App 组件，包装所有 Providers
function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
