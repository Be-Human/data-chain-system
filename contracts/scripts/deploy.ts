import hardhat from "hardhat";
const { ethers } = hardhat;
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // 获取网络配置
  const network = hardhat.network.name;
  console.log(`\n📦 Deploying DataLogger contract to ${network}...`);
  
  // 部署合约
  const DataLogger = await ethers.getContractFactory("DataLogger");
  const dataLogger = await DataLogger.deploy();
  
  await dataLogger.waitForDeployment();
  const contractAddress = await dataLogger.getAddress();
  
  console.log(`✅ DataLogger deployed to: ${contractAddress}`);
  
  // 获取部署信息
  const deployTx = dataLogger.deploymentTransaction();
  const deployBlock = deployTx?.blockNumber || 0;
  
  console.log(`📦 Deployment block: ${deployBlock}`);
  console.log(`🔗 Transaction hash: ${deployTx?.hash}`);
  
  // 保存部署信息
  const deploymentInfo = {
    network,
    address: contractAddress,
    deployBlock,
    deployTx: deployTx?.hash,
    timestamp: new Date().toISOString(),
  };
  
  // 保存到文件
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
  
  // 更新前端环境变量提示
  console.log(`\n📝 Update your frontend/.env file:`);
  console.log(`VITE_CONTRACT_ADDRESS_${network.toUpperCase()}=${contractAddress}`);
  console.log(`VITE_CONTRACT_BLOCK_${network.toUpperCase()}=${deployBlock}`);
  
  // 如果是测试网，提供 Etherscan 验证命令
  if (network !== "localhost" && network !== "hardhat") {
    console.log(`\n🔍 To verify on Etherscan:`);
    console.log(`npx hardhat verify --network ${network} ${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
