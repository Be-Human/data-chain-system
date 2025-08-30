/**
 * 合约配置和 ABI 管理
 * 使用中心化配置系统
 */

import { getContractAddress as getAddress, getDeployBlock, APP_CONFIG } from './index';
import DataLoggerArtifact from '../../../contracts/artifacts/contracts/DataLogger.sol/DataLogger.json';

// 导出 ABI
export const DataLoggerABI = DataLoggerArtifact.abi;

// 重新导出配置函数（保持向后兼容）
export const getContractAddress = getAddress;

// 导出 Sepolia 常量（保持向后兼容）
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CONTRACT_ADDRESS = APP_CONFIG.chains.sepolia?.contractAddress;

// 合约接口类型定义
export interface DataRecord {
  id: bigint;
  sender: string;
  category: string;
  data: string;
  timestamp: bigint;
  blockNumber: bigint;
}

export interface TransactionRecord {
  id: bigint;
  from: string;
  to: string;
  amount: bigint;
  memo: string;
  timestamp: bigint;
  blockNumber: bigint;
}

// 获取合约配置信息
export function getContractConfig(chainId?: number) {
  const address = getContractAddress(chainId);
  const deployBlock = getDeployBlock(chainId);
  
  if (!address) {
    return null;
  }
  
  return {
    address,
    abi: DataLoggerABI,
    deployBlock,
    chainId: chainId || SEPOLIA_CHAIN_ID
  };
}

// 合约方法名称常量
export const ContractMethods = {
  // 写入方法
  LOG_DATA: 'logData',
  LOG_WITH_PAYMENT: 'logWithPayment',
  
  // 读取方法
  GET_USER_DATA_RECORD_IDS: 'getUserDataRecordIds',
  GET_USER_TRANSACTION_RECORD_IDS: 'getUserTransactionRecordIds',
  GET_DATA_RECORD: 'getDataRecord',
  GET_TRANSACTION_RECORD: 'getTransactionRecord',
  GET_RECORD_COUNTS: 'getRecordCounts'
} as const;

// 合约事件名称常量
export const ContractEvents = {
  DATA_STORED: 'DataStored',
  TRANSACTION_LOGGED: 'TransactionLogged'
} as const;

// 导出所有合约相关配置
export default {
  abi: DataLoggerABI,
  getAddress: getContractAddress,
  getConfig: getContractConfig,
  methods: ContractMethods,
  events: ContractEvents
};
