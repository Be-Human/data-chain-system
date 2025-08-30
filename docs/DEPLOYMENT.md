# 📦 部署指南

本文档详细说明如何部署和配置区块链数据上链系统。

## 目录

1. [环境准备](#环境准备)
2. [智能合约部署](#智能合约部署)
3. [前端部署](#前端部署)
4. [The Graph 部署](#the-graph-部署)
5. [生产环境配置](#生产环境配置)

## 环境准备

### 必需工具

```bash
# 检查 Node.js 版本（需要 >= 18）
node --version

# 检查 npm 版本
npm --version

# 安装 Hardhat（如果未安装）
npm install -g hardhat
```

### 获取 API Keys

#### 1. Alchemy API Key
1. 访问 https://dashboard.alchemy.com/
2. 注册账号
3. 创建新 App
   - Name: DataChainSystem
   - Chain: Ethereum
   - Network: Sepolia
4. 复制 API Key

#### 2. Infura Project ID
1. 访问 https://infura.io/
2. 注册账号
3. 创建新项目
4. 复制 Project ID

#### 3. Etherscan API Key
1. 访问 https://etherscan.io/apis
2. 注册账号
3. 生成 API Key

## 智能合约部署

### 1. 配置环境变量

创建 `contracts/.env` 文件：
```env
# 部署账户私钥（不要泄露！）
PRIVATE_KEY=你的私钥

# API Keys
INFURA_KEY=你的Infura_Project_ID
ALCHEMY_KEY=你的Alchemy_API_Key
ETHERSCAN_KEY=你的Etherscan_API_Key

# 网络 RPC（选择一个）
SEPOLIA_RPC=https://sepolia.infura.io/v3/你的Infura_Project_ID
# 或
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/你的Alchemy_API_Key
```

### 2. 配置 Hardhat

编辑 `contracts/hardhat.config.js`：
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111
    },
    mainnet: {
      url: process.env.MAINNET_RPC,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  }
};
```

### 3. 部署合约

```bash
cd contracts

# 编译合约
npx hardhat compile

# 部署到 Sepolia 测试网
npx hardhat run scripts/deploy.js --network sepolia

# 输出示例：
# DataLogger deployed to: 0x1234567890123456789012345678901234567890
# Block number: 4567890
```

### 4. 验证合约

```bash
# 验证合约源码
npx hardhat verify --network sepolia 0x合约地址

# 成功后可以在 Etherscan 上查看验证的合约
```

### 5. 保存部署信息

创建 `contracts/deployments/sepolia.json`：
```json
{
  "DataLogger": {
    "address": "0x部署的合约地址",
    "blockNumber": 4567890,
    "transactionHash": "0x交易哈希",
    "deployer": "0x部署者地址",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 前端部署

### 1. 更新配置

编辑 `frontend/.env`：
```env
# 合约地址
VITE_CONTRACT_ADDRESS_SEPOLIA=0x部署的合约地址
VITE_CONTRACT_BLOCK_SEPOLIA=4567890

# API Keys
VITE_ALCHEMY_KEY=你的Alchemy_API_Key
VITE_INFURA_KEY=你的Infura_Project_ID
VITE_WALLETCONNECT_PROJECT_ID=你的WalletConnect_Project_ID

# 功能开关
VITE_ENABLE_GRAPH=true
VITE_ENABLE_ALCHEMY=true
VITE_ENABLE_MAINNET=false
```

### 2. 本地测试

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 3. 构建生产版本

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

### 4. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 按提示操作：
# - 选择项目名称
# - 选择 frontend 目录
# - 使用默认设置
```

### 5. 部署到 Netlify

方法一：通过 CLI
```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --dir=dist --prod
```

方法二：通过 GitHub
1. 推送代码到 GitHub
2. 在 Netlify 中导入项目
3. 设置构建配置：
   - Build command: `npm run build`
   - Publish directory: `dist`
4. 添加环境变量

### 6. 部署到传统服务器

```bash
# 构建
npm run build

# 上传 dist 目录到服务器
scp -r dist/* user@server:/var/www/html/

# 配置 Nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## The Graph 部署

### 1. 安装 Graph CLI

```bash
npm install -g @graphprotocol/graph-cli
```

### 2. 初始化子图

```bash
cd graph

# 初始化（如果还没有）
graph init --product hosted-service \
  --from-contract 0x合约地址 \
  --network sepolia \
  --abi ../contracts/artifacts/contracts/DataLogger.sol/DataLogger.json \
  datalogger
```

### 3. 配置子图

编辑 `graph/subgraph.yaml`：
```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: DataLogger
    network: sepolia
    source:
      address: "0x合约地址"
      abi: DataLogger
      startBlock: 4567890
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - DataRecord
        - TransactionRecord
      abis:
        - name: DataLogger
          file: ./abis/DataLogger.json
      eventHandlers:
        - event: DataStored(indexed uint256,indexed address,indexed string,string,uint256)
          handler: handleDataStored
        - event: TransactionLogged(indexed uint256,indexed address,indexed address,uint256,string,uint256)
          handler: handleTransactionLogged
      file: ./src/mapping.ts
```

### 4. 部署到 The Graph Studio

```bash
# 认证
graph auth --studio 你的部署密钥

# 构建
graph codegen && graph build

# 部署
graph deploy --studio datalogger
```

### 5. 本地 Graph 节点（开发用）

```bash
# 克隆 graph-node
git clone https://github.com/graphprotocol/graph-node

# 启动（需要 Docker）
cd graph-node/docker
docker-compose up

# 创建子图
npm run create-local

# 部署子图
npm run deploy-local
```

## 生产环境配置

### 1. 环境变量管理

使用 `.env.production`：
```env
# 生产环境配置
VITE_CONTRACT_ADDRESS_MAINNET=0x主网合约地址
VITE_ENABLE_MAINNET=true
VITE_DEBUG_MODE=false
```

### 2. 安全建议

#### 私钥管理
- **永远不要**将私钥提交到代码仓库
- 使用硬件钱包或多签钱包部署
- 考虑使用 AWS KMS 或类似服务

#### API Keys 保护
- 在前端使用域名白名单
- 设置请求限制
- 监控异常使用

#### 合约安全
```solidity
// 添加访问控制
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}

// 添加暂停机制
modifier whenNotPaused() {
    require(!paused, "Contract paused");
    _;
}
```

### 3. 监控和维护

#### 设置监控
- 使用 Tenderly 监控合约
- 设置 Alchemy Notify 告警
- 监控 Gas 价格

#### 日志记录
```javascript
// 添加日志服务
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "你的Sentry_DSN",
  environment: "production"
});
```

### 4. 性能优化

#### 前端优化
```javascript
// 代码分割
const GraphDataDisplay = lazy(() => import('./components/GraphDataDisplay'));

// 图片优化
import imageUrl from './assets/image.png?w=300&webp';
```

#### 合约优化
```solidity
// 使用 mapping 而不是数组
mapping(address => uint256[]) public userRecords;

// 批量操作
function batchLogData(string[] memory data) public {
    for (uint i = 0; i < data.length; i++) {
        logData("batch", data[i]);
    }
}
```

### 5. 备份和恢复

#### 数据备份
```bash
# 导出合约数据
node scripts/export-data.js --network mainnet

# 备份到 IPFS
ipfs add -r ./backups/
```

#### 灾难恢复计划
1. 保存所有部署交易哈希
2. 备份合约源码和 ABI
3. 记录所有配置
4. 准备快速重新部署脚本

## 部署检查清单

### 部署前
- [ ] 合约已通过审计
- [ ] 所有测试通过
- [ ] 环境变量配置正确
- [ ] 有足够的 ETH 支付 Gas

### 部署中
- [ ] 记录合约地址
- [ ] 记录部署区块号
- [ ] 保存交易哈希
- [ ] 验证合约源码

### 部署后
- [ ] 测试所有功能
- [ ] 设置监控告警
- [ ] 更新文档
- [ ] 通知团队成员

## 故障排除

### 问题：部署失败
```bash
# 检查账户余额
npx hardhat run scripts/check-balance.js --network sepolia

# 增加 Gas 限制
gasLimit: 3000000
```

### 问题：前端连接不上合约
```javascript
// 检查合约地址
console.log('Contract:', contractAddress);

// 检查网络
console.log('Chain ID:', chainId);
```

### 问题：The Graph 同步慢
```yaml
# 调整 startBlock
startBlock: 4567890  # 使用准确的部署区块
```

## 支持

如遇到问题，请：
1. 查看控制台错误信息
2. 检查网络和配置
3. 查阅文档
4. 提交 Issue

---

最后更新：2024-01-01
