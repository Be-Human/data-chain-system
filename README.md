# 🔗 区块链数据上链系统

一个基于以太坊的去中心化数据存储系统，提供多种数据上链方式和查询功能。

## 📋 目录

- [系统概述](#系统概述)
- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [API 配置](#api-配置)
- [合约部署](#合约部署)
- [开发指南](#开发指南)
- [常见问题](#常见问题)

## 系统概述

本系统提供了一个完整的区块链数据存储解决方案，支持多种数据上链方式，并提供了丰富的查询和分析功能。

### 核心价值

- **永久存储**：数据永久保存在区块链上，不可篡改
- **多种方式**：支持日志、转账、原生交易等多种上链方式
- **完整查询**：通过合约直接读取、Alchemy API、The Graph 等多种查询方式
- **用户友好**：现代化的 Web 界面，支持 MetaMask 等主流钱包

## 功能特性

### 📤 数据上链

#### 1. **日志方式**
- Gas 费用：~50,000
- 数据存储在合约状态中
- 支持分类和标签
- 查询效率最高

#### 2. **合约转账**
- Gas 费用：~80,000
- 结合转账和数据存储
- 支持备注信息
- 资金流转追踪

#### 3. **原生转账**
- Gas 费用：21,000（最低）
- 数据在交易 input data 中
- 适合简单备注
- 成本最优

### 📊 数据查询

#### 1. **合约数据**
- 直接从智能合约读取
- 免费查询（使用公共 RPC）
- 实时数据
- 完整的历史记录

#### 2. **交易历史**
- 使用 Alchemy API
- 支持多种筛选
  - 本系统合约交易
  - 普通 ETH 转账
  - 其他合约交互
  - 代币交易
- 5分钟缓存机制

#### 3. **The Graph 查询**
- GraphQL 查询接口
- 自定义查询编辑器
- 预设查询模板
- 两栏数据展示

### 🎨 界面特性

- **响应式设计**：支持桌面、平板、手机
- **实时更新**：区块监听，自动刷新
- **多链支持**：Sepolia、Mainnet（可配置）
- **钱包集成**：RainbowKit 提供优雅的连接体验

## 技术架构

```
┌─────────────────────────────────────────────┐
│                  前端应用                     │
│         React + TypeScript + Vite            │
│      RainbowKit + Wagmi + TailwindCSS       │
└─────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  智能合约     │ │ Alchemy  │ │  The Graph   │
│ DataLogger   │ │   API    │ │   Subgraph   │
└──────────────┘ └──────────┘ └──────────────┘
        ▲             ▲             ▲
        └─────────────┼─────────────┘
                      │
              ┌──────────────┐
              │  Ethereum    │
              │  Blockchain  │
              └──────────────┘
```

### 技术栈

- **智能合约**
  - Solidity ^0.8.28
  - Hardhat 开发框架
  - OpenZeppelin 库

- **前端**
  - React 19
  - TypeScript 5
  - Vite 构建工具
  - TailwindCSS 样式

- **Web3 集成**
  - Wagmi v2
  - Viem
  - RainbowKit
  - Ethers.js

- **数据服务**
  - Alchemy SDK
  - The Graph Protocol
  - React Query

## 快速开始

### 前置要求

- Node.js >= 18
- npm 或 yarn
- MetaMask 钱包
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd data-chain-system
```

2. **安装依赖**
```bash
# 安装根目录依赖
npm install

# 安装合约依赖
cd contracts
npm install

# 安装前端依赖
cd ../frontend
npm install
```

3. **配置环境变量**

复制环境变量模板：
```bash
cp frontend/.env.example frontend/.env
```

编辑 `frontend/.env` 文件：
```env
# 合约地址（部署后填写）
VITE_CONTRACT_ADDRESS_SEPOLIA=0x...

# API Keys
VITE_ALCHEMY_KEY=你的_Alchemy_API_Key
VITE_INFURA_KEY=你的_Infura_API_Key
VITE_WALLETCONNECT_PROJECT_ID=你的_WalletConnect_Project_ID
```

4. **启动开发服务器**
```bash
cd frontend
npm run dev
```

访问 http://localhost:5173

## 使用指南

### 1. 连接钱包

1. 点击右上角 "Connect Wallet"
2. 选择 MetaMask 或其他支持的钱包
3. 确认连接请求
4. 切换到 Sepolia 测试网

### 2. 获取测试 ETH

访问以下水龙头获取测试币：
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com)

### 3. 上传数据

#### 日志方式
1. 选择 "📝 日志方式" 标签
2. 输入数据分类（如：personal, business）
3. 输入数据内容
4. 点击 "上传到区块链"
5. 在 MetaMask 中确认交易

#### 合约转账
1. 选择 "🔒 合约转账" 标签
2. 输入接收地址
3. 输入转账金额（ETH）
4. 输入备注信息
5. 点击 "通过合约转账"
6. 确认交易

#### 原生转账
1. 选择 "⚡ 原生转账" 标签
2. 输入接收地址
3. 输入转账金额
4. （可选）输入附加数据
5. 点击 "直接转账"
6. 确认交易

### 4. 查询数据

#### 合约数据
- 自动显示所有通过合约上传的数据
- 支持分页显示
- 显示详细信息：ID、分类、内容、时间、区块

#### 交易历史
1. 点击 "加载交易历史"
2. 使用筛选器查看不同类型交易
3. 点击交易查看详细信息
4. 数据会缓存 5 分钟

#### The Graph 查询
1. 访问 "The Graph" 标签
2. 使用预设模板快速查询
3. 或展开查询编辑器自定义 GraphQL 查询
4. 查看两栏数据展示

## API 配置

### Alchemy

1. 访问 [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. 创建新应用，选择 Sepolia 网络
3. 复制 API Key
4. 配置到 `.env` 文件

### Infura

1. 访问 [Infura Dashboard](https://infura.io/)
2. 创建新项目
3. 复制 Project ID
4. 配置到 `.env` 文件

### WalletConnect

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 创建新项目
3. 复制 Project ID
4. 配置到 `.env` 文件

## 合约部署

### 1. 配置网络

编辑 `contracts/hardhat.config.js`：
```javascript
module.exports = {
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY]
    }
  }
};
```

### 2. 编译合约
```bash
cd contracts
npx hardhat compile
```

### 3. 部署合约
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. 更新合约地址

将部署得到的合约地址更新到 `frontend/.env`：
```env
VITE_CONTRACT_ADDRESS_SEPOLIA=0x新部署的合约地址
```

### 5. 验证合约（可选）
```bash
npx hardhat verify --network sepolia 合约地址
```

## 开发指南

### 项目结构

```
data-chain-system/
├── contracts/              # 智能合约
│   ├── contracts/
│   │   └── DataLogger.sol  # 主合约
│   ├── scripts/           # 部署脚本
│   └── test/              # 合约测试
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── config/        # 配置文件
│   │   ├── lib/           # 工具库
│   │   └── services/      # API 服务
│   └── public/            # 静态资源
├── graph/                 # The Graph 子图
│   ├── schema.graphql     # GraphQL Schema
│   ├── subgraph.yaml      # 子图配置
│   └── src/               # 映射处理
└── docs/                  # 文档
```

### 主要组件

- **DataUploader**: 数据上传表单
- **DataDisplay**: 合约数据展示
- **TransactionHistory**: 交易历史记录
- **GraphDataDisplay**: The Graph 查询界面
- **WalletConnect**: 钱包连接（使用 RainbowKit）

### 添加新功能

1. **添加新的上链方式**
   - 在 `DataLogger.sol` 添加新函数
   - 在 `DataUploader.tsx` 添加新表单
   - 更新 ABI 文件

2. **添加新的查询方式**
   - 在相应组件添加查询逻辑
   - 更新 UI 展示
   - 考虑缓存策略

3. **支持新的网络**
   - 在 `config/index.ts` 添加网络配置
   - 部署合约到新网络
   - 更新环境变量

### 测试

```bash
# 运行合约测试
cd contracts
npx hardhat test

# 运行前端测试（如果有）
cd frontend
npm test
```

## 常见问题

### Q: 为什么交易一直在确认中？
A: 
- 检查 Gas 价格是否过低
- 检查网络是否拥堵
- 尝试在 MetaMask 中加速交易

### Q: 如何切换到主网？
A: 
1. 部署合约到主网
2. 更新 `.env` 中的主网合约地址
3. 设置 `VITE_ENABLE_MAINNET=true`
4. 在界面中切换网络

### Q: The Graph 查询没有数据？
A: 
- 确保 Graph 节点正在运行
- 检查子图是否已部署和同步
- 查看浏览器控制台错误信息

### Q: Alchemy API 配额用完了？
A: 
- 升级 Alchemy 账户
- 使用 Infura 作为备选
- 启用缓存减少请求

### Q: 如何导出数据？
A: 
- 目前支持通过浏览器开发者工具导出
- 未来版本将添加 CSV 导出功能

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交 PR 前请确保：
- 代码通过 ESLint 检查
- 添加必要的注释
- 更新相关文档
- 测试所有功能

## 许可证

MIT License

## 联系方式

- GitHub: [项目地址]
- Issues: [问题反馈]

---

**免责声明**：本项目仅供学习和演示使用，请勿在生产环境中直接使用。使用前请充分测试并审计智能合约代码。

