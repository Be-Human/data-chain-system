/**
 * Provider 管理器
 * 统一管理 Infura 和 Alchemy 的配置和切换
 */

export type ProviderType = 'alchemy' | 'infura' | 'auto';

export interface ProviderConfig {
  name: string;
  type: ProviderType;
  apiKey?: string;
  getRpcUrl: (network: string) => string;
  features: {
    rpc: boolean;
    assetTransfers: boolean;
    enhanced: boolean;
    graphQL?: boolean;
  };
  limits?: {
    requests?: number;
    compute?: number;
    period: string;
  };
}

// Provider 配置定义
const PROVIDER_CONFIGS: Record<string, Omit<ProviderConfig, 'apiKey' | 'getRpcUrl'>> = {
  alchemy: {
    name: 'Alchemy',
    type: 'alchemy',
    features: {
      rpc: true,
      assetTransfers: true,
      enhanced: true,
      graphQL: true
    },
    limits: {
      compute: 300_000_000,
      period: '月'
    }
  },
  infura: {
    name: 'Infura',
    type: 'infura',
    features: {
      rpc: true,
      assetTransfers: false,
      enhanced: false,
      graphQL: false
    },
    limits: {
      requests: 100_000,
      period: '天'
    }
  }
};

// RPC URLs
const RPC_URLS = {
  alchemy: {
    sepolia: (key: string) => `https://eth-sepolia.g.alchemy.com/v2/${key}`,
    mainnet: (key: string) => `https://eth-mainnet.g.alchemy.com/v2/${key}`,
    base: (key: string) => `https://base-mainnet.g.alchemy.com/v2/${key}`,
    arbitrum: (key: string) => `https://arb-mainnet.g.alchemy.com/v2/${key}`,
  },
  infura: {
    sepolia: (key: string) => `https://sepolia.infura.io/v3/${key}`,
    mainnet: (key: string) => `https://mainnet.infura.io/v3/${key}`,
    base: (key: string) => `https://base-mainnet.infura.io/v3/${key}`,
    arbitrum: (key: string) => `https://arbitrum-mainnet.infura.io/v3/${key}`,
  }
};

class ProviderManager {
  private currentProvider: ProviderType;
  private configs: Map<ProviderType, ProviderConfig> = new Map();
  
  constructor() {
    // 初始化配置
    this.initializeConfigs();
    
    // 确定当前 Provider
    // 优先级: localStorage > 环境变量 > 自动选择
    const stored = localStorage.getItem('preferred_provider') as ProviderType;
    const envDefault = import.meta.env.VITE_DEFAULT_PROVIDER as ProviderType;
    
    if (stored && this.isProviderAvailable(stored)) {
      this.currentProvider = stored;
    } else if (envDefault && this.isProviderAvailable(envDefault)) {
      this.currentProvider = envDefault;
    } else {
      this.currentProvider = this.autoSelectProvider();
    }
    
    // 保存选择
    if (this.currentProvider !== 'auto') {
      localStorage.setItem('preferred_provider', this.currentProvider);
    }
  }
  
  private initializeConfigs() {
    // Alchemy 配置
    const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;
    if (alchemyKey && alchemyKey !== 'YOUR_ALCHEMY_KEY') {
      this.configs.set('alchemy', {
        ...PROVIDER_CONFIGS.alchemy,
        apiKey: alchemyKey,
        getRpcUrl: (network: string) => {
          const urlBuilder = RPC_URLS.alchemy[network as keyof typeof RPC_URLS.alchemy];
          return urlBuilder ? urlBuilder(alchemyKey) : '';
        }
      });
    }
    
    // Infura 配置
    const infuraKey = import.meta.env.VITE_INFURA_KEY;
    if (infuraKey && infuraKey !== 'YOUR_INFURA_KEY') {
      this.configs.set('infura', {
        ...PROVIDER_CONFIGS.infura,
        apiKey: infuraKey,
        getRpcUrl: (network: string) => {
          const urlBuilder = RPC_URLS.infura[network as keyof typeof RPC_URLS.infura];
          return urlBuilder ? urlBuilder(infuraKey) : '';
        }
      });
    }
  }
  
  private autoSelectProvider(): ProviderType {
    // 自动选择逻辑
    // 1. 如果只有一个可用，选择那个
    // 2. 如果都可用，优先 Alchemy（功能更全）
    // 3. 如果都不可用，返回 'auto'（会使用公共 RPC）
    
    const hasAlchemy = this.configs.has('alchemy');
    const hasInfura = this.configs.has('infura');
    
    if (hasAlchemy && !hasInfura) return 'alchemy';
    if (!hasAlchemy && hasInfura) return 'infura';
    if (hasAlchemy && hasInfura) return 'alchemy'; // 优先 Alchemy
    
    console.warn('⚠️ No provider API keys configured, using public RPC');
    return 'auto';
  }
  
  // 检查 Provider 是否可用
  isProviderAvailable(type: ProviderType): boolean {
    if (type === 'auto') return true;
    return this.configs.has(type);
  }
  
  // 获取当前 Provider
  getCurrentProvider(): ProviderType {
    return this.currentProvider;
  }
  
  // 获取当前 Provider 配置
  getCurrentConfig(): ProviderConfig | null {
    if (this.currentProvider === 'auto') {
      return null;
    }
    return this.configs.get(this.currentProvider) || null;
  }
  
  // 切换 Provider
  switchProvider(type: ProviderType): boolean {
    if (!this.isProviderAvailable(type)) {
      console.error(`Provider ${type} is not available`);
      return false;
    }
    
    this.currentProvider = type;
    if (type !== 'auto') {
      localStorage.setItem('preferred_provider', type);
    } else {
      localStorage.removeItem('preferred_provider');
    }
    
    // 触发页面刷新以应用新配置
    // 在实际使用时会调用
    return true;
  }
  
  // 获取 RPC URL
  getRpcUrl(network: string): string {
    const config = this.getCurrentConfig();
    if (!config) {
      // 使用公共 RPC
      return this.getPublicRpcUrl(network);
    }
    return config.getRpcUrl(network);
  }
  
  // 获取公共 RPC（备用）
  private getPublicRpcUrl(network: string): string {
    const publicRpcs: Record<string, string> = {
      sepolia: 'https://rpc.sepolia.org',
      mainnet: 'https://ethereum.publicnode.com',
      base: 'https://mainnet.base.org',
      arbitrum: 'https://arb1.arbitrum.io/rpc'
    };
    return publicRpcs[network] || '';
  }
  
  // 检查功能是否可用
  hasFeature(feature: keyof ProviderConfig['features']): boolean {
    const config = this.getCurrentConfig();
    if (!config) return false;
    return config.features[feature] || false;
  }
  
  // 获取所有可用的 Providers
  getAvailableProviders(): Array<{type: ProviderType; name: string; current: boolean}> {
    const providers: Array<{type: ProviderType; name: string; current: boolean}> = [];
    
    // 添加配置好的 providers
    this.configs.forEach((config, type) => {
      providers.push({
        type,
        name: config.name,
        current: type === this.currentProvider
      });
    });
    
    // 添加 auto 选项
    providers.unshift({
      type: 'auto',
      name: '自动选择',
      current: this.currentProvider === 'auto'
    });
    
    return providers;
  }
  
  // 获取 Provider 状态信息
  getStatus() {
    const current = this.getCurrentConfig();
    return {
      provider: this.currentProvider,
      name: current?.name || '公共 RPC',
      hasApiKey: !!current?.apiKey,
      features: current?.features || {
        rpc: true,
        assetTransfers: false,
        enhanced: false
      },
      limits: current?.limits,
      available: this.getAvailableProviders()
    };
  }
  
  // 获取 API Key（用于服务）
  getApiKey(): string | undefined {
    const config = this.getCurrentConfig();
    return config?.apiKey;
  }
  
  // 获取特定 Provider 的 API Key
  getProviderApiKey(type: 'alchemy' | 'infura'): string | undefined {
    const config = this.configs.get(type);
    return config?.apiKey;
  }
}

// 导出单例
export const providerManager = new ProviderManager();

// 导出便捷函数
export function getCurrentProvider() {
  return providerManager.getCurrentProvider();
}

export function getRpcUrl(network: string) {
  return providerManager.getRpcUrl(network);
}

export function switchProvider(type: ProviderType) {
  const success = providerManager.switchProvider(type);
  if (success) {
    // 刷新页面以应用新配置
    window.location.reload();
  }
  return success;
}

export function getProviderStatus() {
  return providerManager.getStatus();
}

// 导出类型
export type { ProviderType, ProviderConfig };

// 在开发模式下输出状态
if (import.meta.env.DEV) {
  console.log('🔌 Provider Manager initialized:', providerManager.getStatus());
}
