import { Alchemy, Network } from 'alchemy-sdk';
import { APP_CONFIG } from '../config';
import { providerManager } from '../config/provider';

// 检查是否有有效的 API Key
const hasValidApiKey = () => {
  // 优先使用当前 provider 的 key
  const currentProvider = providerManager.getCurrentProvider();
  
  // 如果当前是 Alchemy，使用 Alchemy key
  if (currentProvider === 'alchemy') {
    const apiKey = providerManager.getApiKey();
    return apiKey && apiKey !== 'YOUR_ALCHEMY_KEY' && apiKey.length > 10;
  }
  
  // 如果不是 Alchemy，但有 Alchemy key，也可以使用
  const alchemyKey = providerManager.getProviderApiKey('alchemy');
  return alchemyKey && alchemyKey !== 'YOUR_ALCHEMY_KEY' && alchemyKey.length > 10;
};

// 获取 Alchemy API Key
const getAlchemyApiKey = () => {
  const currentProvider = providerManager.getCurrentProvider();
  
  if (currentProvider === 'alchemy') {
    return providerManager.getApiKey();
  }
  
  // 尝试获取 Alchemy 的 key
  return providerManager.getProviderApiKey('alchemy');
};

// Alchemy 配置
const settings = {
  apiKey: getAlchemyApiKey(),
  network: Network.ETH_SEPOLIA,
};

// 只有在有 API Key 时才初始化 Alchemy
export const alchemy = hasValidApiKey() ? new Alchemy(settings) : null;

// 获取资产转移记录
export async function getAssetTransfers(address: string) {
  // 如果没有配置 Alchemy API Key，返回空数组并提示
  if (!alchemy) {
    console.warn('⚠️ Alchemy API Key 未配置');
    console.log('请在 frontend/.env 文件中配置 VITE_ALCHEMY_KEY');
    console.log('可以从 https://dashboard.alchemy.com/ 免费获取');
    
    // 如果启用了调试模式，显示更多信息
    if (APP_CONFIG.debug) {
      console.log('当前配置:', {
        hasKey: hasValidApiKey(),
        keyValue: import.meta.env.VITE_ALCHEMY_KEY?.slice(0, 10) + '...'
      });
    }
    
    return [];
  }
  
  try {
    const data = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      maxCount: 100,
      withMetadata: true,
      order: "desc",
    });
    
    // 也获取接收的转账
    const received = await alchemy.core.getAssetTransfers({
      toAddress: address,
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      maxCount: 100,
      withMetadata: true,
      order: "desc",
    });
    
    // 合并并按时间排序
    const allTransfers = [...data.transfers, ...received.transfers];
    allTransfers.sort((a, b) => {
      const timeA = new Date(a.metadata?.blockTimestamp || 0).getTime();
      const timeB = new Date(b.metadata?.blockTimestamp || 0).getTime();
      return timeB - timeA;
    });
    
    // 去重（同一笔交易可能既是发送又是接收）
    const uniqueTransfers = allTransfers.filter((transfer, index, self) =>
      index === self.findIndex((t) => t.hash === transfer.hash)
    );
    
    return uniqueTransfers;
  } catch (error) {
    console.error('Failed to get asset transfers:', error);
    
    // 如果是 API Key 错误，提供更详细的提示
    if (error instanceof Error && error.message.includes('apiKey')) {
      console.error('❌ Alchemy API Key 无效，请检查配置');
    }
    
    return [];
  }
}

// 获取代币余额
export async function getTokenBalances(address: string) {
  if (!alchemy) {
    console.warn('⚠️ Alchemy API Key 未配置，无法获取代币余额');
    return null;
  }
  
  try {
    const balances = await alchemy.core.getTokenBalances(address);
    return balances;
  } catch (error) {
    console.error('Failed to get token balances:', error);
    return null;
  }
}

// 检查 Alchemy 服务状态
export function getAlchemyStatus() {
  const providerStatus = providerManager.getStatus();
  const hasAlchemyKey = hasValidApiKey();
  
  return {
    isConfigured: hasAlchemyKey,
    isEnabled: APP_CONFIG.features.enableAlchemy,
    currentProvider: providerStatus.provider,
    providerName: providerStatus.name,
    hasAssetTransfers: providerStatus.features.assetTransfers || hasAlchemyKey,
    apiKey: getAlchemyApiKey()?.slice(0, 10) + '...',
    network: Network.ETH_SEPOLIA
  };
}
