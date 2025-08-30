/**
 * 中心化配置管理
 * 所有配置从环境变量读取，支持多链和多环境
 */

// Chain 类型定义已内置，无需导入

// 链配置类型
export interface ChainConfig {
  id: number;
  name: string;
  contractAddress?: `0x${string}`;
  deployBlock?: number;
  rpcUrl?: string;
  explorerUrl: string;
  explorerApiUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet: boolean;
}

// 应用配置类型
export interface AppConfig {
  defaultChain: string;
  chains: Record<string, ChainConfig>;
  features: {
    enableGraph: boolean;
    enableAlchemy: boolean;
    enableInfura: boolean;
    enableMainnet: boolean;
  };
  api: {
    infuraKey?: string;
    alchemyKey?: string;
    walletConnectProjectId?: string;
    graphEndpoints: Record<string, string>;
  };
  debug: boolean;
}

// 链配置
const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`,
    deployBlock: parseInt(import.meta.env.VITE_CONTRACT_BLOCK_SEPOLIA || '0'),
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC,
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: true
  },
  mainnet: {
    id: 1,
    name: 'Ethereum',
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_MAINNET as `0x${string}`,
    deployBlock: parseInt(import.meta.env.VITE_CONTRACT_BLOCK_MAINNET || '0'),
    rpcUrl: import.meta.env.VITE_MAINNET_RPC,
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: false
  },
  base: {
    id: 8453,
    name: 'Base',
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_BASE as `0x${string}`,
    deployBlock: parseInt(import.meta.env.VITE_CONTRACT_BLOCK_BASE || '0'),
    rpcUrl: import.meta.env.VITE_BASE_RPC,
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: false
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_ARBITRUM as `0x${string}`,
    deployBlock: parseInt(import.meta.env.VITE_CONTRACT_BLOCK_ARBITRUM || '0'),
    rpcUrl: import.meta.env.VITE_ARBITRUM_RPC,
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: false
  }
};

// 完整应用配置
export const APP_CONFIG: AppConfig = {
  defaultChain: import.meta.env.VITE_DEFAULT_CHAIN || 'sepolia',
  chains: CHAIN_CONFIGS,
  features: {
    enableGraph: import.meta.env.VITE_ENABLE_GRAPH === 'true',
    enableAlchemy: import.meta.env.VITE_ENABLE_ALCHEMY === 'true',
    enableInfura: import.meta.env.VITE_ENABLE_INFURA === 'true',
    enableMainnet: import.meta.env.VITE_ENABLE_MAINNET === 'true'
  },
  api: {
    infuraKey: import.meta.env.VITE_INFURA_KEY,
    alchemyKey: import.meta.env.VITE_ALCHEMY_KEY,
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    graphEndpoints: {
      sepolia: import.meta.env.VITE_GRAPH_ENDPOINT_SEPOLIA || '',
      mainnet: import.meta.env.VITE_GRAPH_ENDPOINT_MAINNET || '',
      studio: import.meta.env.VITE_GRAPH_STUDIO_ENDPOINT || ''
    }
  },
  debug: import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV
};

// 辅助函数：获取当前链配置
export function getChainConfig(chainId?: number): ChainConfig | undefined {
  if (!chainId) {
    return CHAIN_CONFIGS[APP_CONFIG.defaultChain];
  }
  return Object.values(CHAIN_CONFIGS).find(chain => chain.id === chainId);
}

// 辅助函数：获取合约地址
export function getContractAddress(chainId?: number): `0x${string}` | undefined {
  const chain = getChainConfig(chainId);
  return chain?.contractAddress;
}

// 辅助函数：获取部署区块
export function getDeployBlock(chainId?: number): number {
  const chain = getChainConfig(chainId);
  return chain?.deployBlock || 0;
}

// 辅助函数：获取区块浏览器链接
export function getExplorerUrl(chainId?: number, type: 'tx' | 'address' | 'block' = 'address', hash?: string): string {
  const chain = getChainConfig(chainId);
  if (!chain) return '#';
  
  const baseUrl = chain.explorerUrl;
  if (!hash) return baseUrl;
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hash}`;
    case 'address':
      return `${baseUrl}/address/${hash}`;
    case 'block':
      return `${baseUrl}/block/${hash}`;
    default:
      return baseUrl;
  }
}

// 辅助函数：获取 Graph 端点
export function getGraphEndpoint(chainId?: number): string | undefined {
  const chain = getChainConfig(chainId);
  if (!chain) return undefined;
  
  // 根据链名称获取对应的 Graph 端点
  const chainName = Object.entries(CHAIN_CONFIGS).find(([_, config]) => config.id === chainId)?.[0];
  return chainName ? APP_CONFIG.api.graphEndpoints[chainName] : undefined;
}

// 辅助函数：检查链是否被支持
export function isChainSupported(chainId: number): boolean {
  return Object.values(CHAIN_CONFIGS).some(chain => chain.id === chainId);
}

// 辅助函数：获取所有已配置合约的链
export function getSupportedChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(chain => 
    chain.contractAddress && 
    (chain.testnet || APP_CONFIG.features.enableMainnet)
  );
}

// 导出配置验证（开发模式下）
if (APP_CONFIG.debug) {
  console.group('🔧 App Configuration');
  console.log('Default Chain:', APP_CONFIG.defaultChain);
  console.log('Supported Chains:', getSupportedChains().map(c => c.name));
  console.log('Features:', APP_CONFIG.features);
  console.log('Contract Addresses:', Object.entries(CHAIN_CONFIGS).reduce((acc, [name, config]) => {
    if (config.contractAddress) {
      acc[name] = config.contractAddress;
    }
    return acc;
  }, {} as Record<string, string>));
  console.groupEnd();
}

// 配置验证
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查默认链
  if (!CHAIN_CONFIGS[APP_CONFIG.defaultChain]) {
    errors.push(`Default chain '${APP_CONFIG.defaultChain}' not found in chain configs`);
  }
  
  // 检查至少有一个链配置了合约地址
  const hasContract = Object.values(CHAIN_CONFIGS).some(chain => chain.contractAddress);
  if (!hasContract) {
    errors.push('No contract addresses configured for any chain');
  }
  
  // 检查 API keys（警告级别）
  if (!APP_CONFIG.api.infuraKey && !APP_CONFIG.api.alchemyKey) {
    console.warn('⚠️ No Infura or Alchemy API key configured');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// 运行配置验证
const validation = validateConfig();
if (!validation.valid) {
  console.error('❌ Configuration errors:', validation.errors);
}

export default APP_CONFIG;
