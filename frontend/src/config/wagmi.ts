import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { localhost, sepolia, mainnet, base, arbitrum } from 'wagmi/chains';
import { APP_CONFIG, getSupportedChains } from '../config';
import { getRpcUrl, getProviderStatus } from '../config/provider';
import { injected } from 'wagmi/connectors';

// 自定义本地链配置
const localhostChain = {
  ...localhost,
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
};

// 动态生成链配置
function getChains() {
  const chains = [];
  const supportedChains = getSupportedChains();
  
  // 根据配置添加支持的链
  supportedChains.forEach(chain => {
    switch(chain.id) {
      case 11155111:
        chains.push(sepolia);
        break;
      case 1:
        if (APP_CONFIG.features.enableMainnet) {
          chains.push(mainnet);
        }
        break;
      case 8453:
        if (APP_CONFIG.features.enableMainnet) {
          chains.push(base);
        }
        break;
      case 42161:
        if (APP_CONFIG.features.enableMainnet) {
          chains.push(arbitrum);
        }
        break;
      case 31337:
        if (import.meta.env.DEV) {
          chains.push(localhostChain);
        }
        break;
    }
  });
  
  // 如果没有链，至少添加 Sepolia
  if (chains.length === 0) {
    chains.push(sepolia);
  }
  
  return chains;
}

// 动态生成 transports
function getTransports() {
  const transports: Record<number, any> = {};
  const chains = getChains();
  const providerStatus = getProviderStatus();
  
  chains.forEach(chain => {
    switch(chain.id) {
      case 31337:
        transports[chain.id] = http('http://127.0.0.1:8545');
        break;
      case 11155111: // Sepolia
        transports[chain.id] = http(getRpcUrl('sepolia'));
        break;
      case 1: // Mainnet
        transports[chain.id] = http(getRpcUrl('mainnet'));
        break;
      case 8453: // Base
        transports[chain.id] = http(getRpcUrl('base'));
        break;
      case 42161: // Arbitrum
        transports[chain.id] = http(getRpcUrl('arbitrum'));
        break;
      default:
        transports[chain.id] = http();
    }
  });
  
  // 在开发模式下显示使用的 Provider
  if (APP_CONFIG.debug) {
    console.log('🌐 RPC Provider:', providerStatus.name);
  }
  
  return transports;
}

// 导出配置
export const config = getDefaultConfig({
  appName: 'Data Chain System',
  projectId: APP_CONFIG.api.walletConnectProjectId || 'YOUR_PROJECT_ID',
  chains: getChains() as any,
  transports: getTransports(),
});

// 在开发模式下打印配置信息
if (APP_CONFIG.debug) {
  const hasWalletConnect = APP_CONFIG.api.walletConnectProjectId && 
                          APP_CONFIG.api.walletConnectProjectId !== 'YOUR_WALLETCONNECT_PROJECT_ID';
  
  console.log('🔗 Wagmi Config:', {
    chains: getChains().map(c => ({ id: c.id, name: c.name })),
    projectId: hasWalletConnect ? '✓ Configured' : '✗ Missing',
    provider: getProviderStatus().name
  });
  
  if (hasWalletConnect) {
    console.log('✅ WalletConnect 已配置，支持多钱包连接');
  }
}
