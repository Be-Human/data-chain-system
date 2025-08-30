# 🔧 API 文档

本文档描述了系统的所有 API 接口，包括智能合约接口、前端服务接口和 GraphQL 查询接口。

## 目录

1. [智能合约 API](#智能合约-api)
2. [Web3 集成](#web3-集成)
3. [GraphQL API](#graphql-api)
4. [服务接口](#服务接口)
5. [工具函数](#工具函数)

## 智能合约 API

### DataLogger 合约

**合约地址（Sepolia）**: `0xEd05Da57AE62F71FE11e8643fF6a874919cD0c7d`

### 写入方法

#### logData
存储纯数据记录

```solidity
function logData(string memory category, string memory data) public
```

**参数**：
- `category` (string): 数据分类标签
- `data` (string): 要存储的数据内容

**示例调用**：
```javascript
const tx = await contract.logData("personal", "用户数据内容");
await tx.wait();
```

**事件**：
```solidity
event DataStored(
    uint256 indexed recordId,
    address indexed sender,
    string indexed category,
    string data,
    uint256 timestamp
);
```

---

#### logWithPayment
带转账的数据记录

```solidity
function logWithPayment(address payable recipient, string memory memo) public payable
```

**参数**：
- `recipient` (address): 接收方地址
- `memo` (string): 转账备注

**要求**：
- `msg.value > 0`: 必须发送 ETH
- `recipient != address(0)`: 有效地址

**示例调用**：
```javascript
const tx = await contract.logWithPayment(
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
    "支付说明",
    { value: ethers.parseEther("0.1") }
);
```

**事件**：
```solidity
event TransactionLogged(
    uint256 indexed recordId,
    address indexed from,
    address indexed to,
    uint256 amount,
    string memo,
    uint256 timestamp
);
```

### 查询方法

#### getUserDataRecordIds
获取用户的所有数据记录ID

```solidity
function getUserDataRecordIds(address user) public view returns (uint256[] memory)
```

**返回值**：
- `uint256[]`: 记录ID数组

---

#### getUserTransactionRecordIds
获取用户的所有转账记录ID

```solidity
function getUserTransactionRecordIds(address user) public view returns (uint256[] memory)
```

---

#### getDataRecord
获取数据记录详情

```solidity
function getDataRecord(uint256 recordId) public view returns (DataRecord memory)
```

**返回结构**：
```solidity
struct DataRecord {
    uint256 id;
    address sender;
    string category;
    string data;
    uint256 timestamp;
    uint256 blockNumber;
}
```

---

#### getTransactionRecord
获取转账记录详情

```solidity
function getTransactionRecord(uint256 recordId) public view returns (TransactionRecord memory)
```

**返回结构**：
```solidity
struct TransactionRecord {
    uint256 id;
    address from;
    address to;
    uint256 amount;
    string memo;
    uint256 timestamp;
    uint256 blockNumber;
}
```

---

#### getRecordCounts
获取记录总数统计

```solidity
function getRecordCounts() public view returns (uint256 dataCount, uint256 txCount)
```

## Web3 集成

### 使用 Wagmi Hooks

#### 连接钱包
```typescript
import { useAccount, useConnect } from 'wagmi';

function WalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  if (!isConnected) {
    return (
      <button onClick={() => connect({ connector: connectors[0] })}>
        连接钱包
      </button>
    );
  }
  
  return <div>已连接: {address}</div>;
}
```

#### 读取合约数据
```typescript
import { useReadContract } from 'wagmi';
import { DataLoggerABI } from './config/contracts';

function DataReader() {
  const { data, isError, isLoading } = useReadContract({
    address: contractAddress,
    abi: DataLoggerABI,
    functionName: 'getUserDataRecordIds',
    args: [userAddress],
  });
  
  if (isLoading) return <div>加载中...</div>;
  if (isError) return <div>错误</div>;
  
  return <div>记录IDs: {data?.toString()}</div>;
}
```

#### 写入合约数据
```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

function DataWriter() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  
  const handleSubmit = () => {
    writeContract({
      address: contractAddress,
      abi: DataLoggerABI,
      functionName: 'logData',
      args: ['category', 'data content'],
    });
  };
  
  return (
    <button onClick={handleSubmit} disabled={isConfirming}>
      {isConfirming ? '确认中...' : '上传数据'}
    </button>
  );
}
```

### 使用 Ethers.js

#### 初始化提供者
```javascript
import { ethers } from 'ethers';

// MetaMask 提供者
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// 合约实例
const contract = new ethers.Contract(
  contractAddress,
  DataLoggerABI,
  signer
);
```

#### 调用合约方法
```javascript
// 读取数据
const recordIds = await contract.getUserDataRecordIds(address);

// 写入数据
const tx = await contract.logData("category", "data");
const receipt = await tx.wait();
console.log('交易哈希:', receipt.hash);
```

## GraphQL API

### 端点

- **本地开发**: `http://localhost:8000/subgraphs/name/datalogger`
- **生产环境**: 配置在环境变量中

### 查询示例

#### 获取数据记录
```graphql
query GetDataRecords($first: Int!, $skip: Int!) {
  dataRecords(
    first: $first
    skip: $skip
    orderBy: blockNumber
    orderDirection: desc
  ) {
    id
    recordId
    sender
    category
    data
    timestamp
    blockNumber
  }
}
```

**变量**：
```json
{
  "first": 10,
  "skip": 0
}
```

#### 获取交易记录
```graphql
query GetTransactionRecords($first: Int!, $skip: Int!) {
  transactionRecords(
    first: $first
    skip: $skip
    orderBy: amount
    orderDirection: desc
  ) {
    id
    recordId
    from
    to
    amount
    memo
    timestamp
    blockNumber
  }
}
```

#### 按用户筛选
```graphql
query UserRecords($address: Bytes!) {
  dataRecords(where: { sender: $address }) {
    id
    category
    data
    timestamp
  }
}
```

#### 按时间筛选
```graphql
query RecentRecords($timestamp: BigInt!) {
  dataRecords(
    where: { timestamp_gte: $timestamp }
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    sender
    data
    timestamp
  }
}
```

### 使用 JavaScript 调用

```javascript
async function queryGraph(query, variables) {
  const response = await fetch(GRAPH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  
  const data = await response.json();
  return data.data;
}

// 使用示例
const records = await queryGraph(GET_DATA_RECORDS_QUERY, {
  first: 10,
  skip: 0
});
```

## 服务接口

### Alchemy API

#### 获取资产转移
```typescript
import { getAssetTransfers } from './services/alchemy';

async function loadTransfers(address: string) {
  const transfers = await getAssetTransfers(address);
  return transfers;
}
```

**返回格式**：
```typescript
interface Transfer {
  hash: string;
  from: string;
  to: string;
  value: number;
  asset: string;
  category: 'external' | 'internal' | 'erc20' | 'erc721';
  metadata?: {
    blockTimestamp: string;
  };
}
```

### Provider 管理

#### 获取当前 Provider
```typescript
import { providerManager } from './config/provider';

const provider = providerManager.getCurrentProvider();
// 'alchemy' | 'infura' | 'public'

const apiKey = providerManager.getApiKey();
```

#### 获取 RPC URL
```typescript
import { getRpcUrl } from './config/provider';

const rpcUrl = getRpcUrl('sepolia');
// https://eth-sepolia.g.alchemy.com/v2/...
```

## 工具函数

### 格式化函数

#### 格式化地址
```typescript
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// 示例: 0x1234...5678
```

#### 格式化时间戳
```typescript
function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN');
}

// 示例: 2024/1/1 12:00:00
```

#### 格式化金额
```typescript
import { formatEther } from 'viem';

function formatAmount(amount: bigint): string {
  return formatEther(amount) + ' ETH';
}

// 示例: 1.5 ETH
```

### 数据转换

#### 文本转 Hex
```typescript
import { stringToHex } from 'viem';

const hex = stringToHex('Hello World');
// 0x48656c6c6f20576f726c64
```

#### Hex 转文本
```typescript
import { hexToString } from 'viem';

const text = hexToString('0x48656c6c6f20576f726c64');
// Hello World
```

#### 解析 Input Data
```typescript
function parseInputData(input: `0x${string}`) {
  if (!input || input === '0x') {
    return { type: 'empty', content: '无数据' };
  }
  
  try {
    const text = hexToString(input);
    if (/^[\x20-\x7E]+$/.test(text)) {
      return { type: 'text', content: text };
    }
  } catch {}
  
  if (input.length >= 10) {
    const selector = input.slice(0, 10);
    // 检查已知的函数选择器
    return { type: 'contract', content: selector };
  }
  
  return { type: 'hex', content: input };
}
```

### 缓存管理

#### 设置缓存
```typescript
function setCache(key: string, data: any, duration: number = 300000) {
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now(),
    expires: Date.now() + duration
  }));
}
```

#### 读取缓存
```typescript
function getCache(key: string) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  const { data, expires } = JSON.parse(cached);
  if (Date.now() > expires) {
    localStorage.removeItem(key);
    return null;
  }
  
  return data;
}
```

### 错误处理

#### 交易错误处理
```typescript
async function handleTransaction(fn: () => Promise<any>) {
  try {
    const tx = await fn();
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error: any) {
    if (error.code === 'ACTION_REJECTED') {
      return { success: false, error: '用户取消交易' };
    }
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return { success: false, error: '余额不足' };
    }
    return { success: false, error: error.message };
  }
}
```

## 类型定义

### 合约类型
```typescript
interface DataRecord {
  id: bigint;
  sender: string;
  category: string;
  data: string;
  timestamp: bigint;
  blockNumber: bigint;
}

interface TransactionRecord {
  id: bigint;
  from: string;
  to: string;
  amount: bigint;
  memo: string;
  timestamp: bigint;
  blockNumber: bigint;
}
```

### 配置类型
```typescript
interface ChainConfig {
  id: number;
  name: string;
  contractAddress?: `0x${string}`;
  deployBlock?: number;
  rpcUrl?: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet: boolean;
}
```

## 常用常量

```typescript
// Gas 限制
export const GAS_LIMITS = {
  LOG_DATA: 100000,
  LOG_WITH_PAYMENT: 150000,
  NATIVE_TRANSFER: 21000,
};

// 支持的网络
export const SUPPORTED_CHAINS = {
  SEPOLIA: 11155111,
  MAINNET: 1,
  BASE: 8453,
  ARBITRUM: 42161,
};

// API 端点
export const API_ENDPOINTS = {
  ALCHEMY_SEPOLIA: 'https://eth-sepolia.g.alchemy.com/v2/',
  INFURA_SEPOLIA: 'https://sepolia.infura.io/v3/',
  GRAPH_LOCAL: 'http://localhost:8000/subgraphs/name/',
};
```

## 测试示例

### 单元测试
```javascript
describe('DataLogger Contract', () => {
  it('should log data correctly', async () => {
    const tx = await contract.logData('test', 'data');
    const receipt = await tx.wait();
    
    expect(receipt.status).toBe(1);
    
    const records = await contract.getUserDataRecordIds(address);
    expect(records.length).toBeGreaterThan(0);
  });
});
```

### 集成测试
```javascript
describe('Data Upload Flow', () => {
  it('should complete full upload cycle', async () => {
    // 1. 连接钱包
    await connect();
    
    // 2. 上传数据
    const tx = await uploadData('test', 'content');
    
    // 3. 等待确认
    await tx.wait();
    
    // 4. 查询数据
    const data = await queryData();
    
    expect(data).toContain('content');
  });
});
```

---

最后更新：2024-01-01

如需更多帮助，请查看[完整文档](./README.md)或[提交 Issue](https://github.com/...)。
