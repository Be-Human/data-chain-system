import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../../.env") });

// ABI (只需要查询方法)
const ABI = [
  "function getRecordCounts() view returns (uint256 dataCount, uint256 txCount)",
  "function getUserDataRecordIds(address user) view returns (uint256[])",
  "function getUserTransactionRecordIds(address user) view returns (uint256[])",
  "event DataStored(uint256 indexed recordId, address indexed sender, string indexed category, string data, uint256 timestamp)",
  "event TransactionLogged(uint256 indexed recordId, address indexed from, address indexed to, uint256 amount, string memo, uint256 timestamp)"
];

// 合约地址配置
const CONTRACTS = {
  sepolia: "0xEd05Da57AE62F71FE11e8643fF6a874919cD0c7d",
  mainnet: "",
  localhost: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
};

async function verifyContract(network: string = "sepolia") {
  const contractAddress = CONTRACTS[network as keyof typeof CONTRACTS];
  
  if (!contractAddress) {
    console.error(`❌ No contract address configured for ${network}`);
    return;
  }
  
  console.log(`\n🔍 Verifying contract on ${network}...`);
  console.log(`📍 Contract address: ${contractAddress}`);
  
  // 连接到网络
  let provider: ethers.Provider;
  
  switch (network) {
    case "sepolia":
      const infuraKey = process.env.INFURA_KEY || process.env.VITE_INFURA_KEY || process.env.SEPOLIA_RPC_URL?.split('/').pop();
      if (!infuraKey) {
        console.error("❌ No Infura key found in environment variables");
        return;
      }
      provider = new ethers.JsonRpcProvider(
        `https://sepolia.infura.io/v3/${infuraKey}`
      );
      break;
    case "localhost":
      provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      break;
    default:
      console.error(`❌ Unsupported network: ${network}`);
      return;
  }
  
  try {
    // 检查合约是否存在
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      console.error(`❌ No contract found at ${contractAddress}`);
      return;
    }
    console.log(`✅ Contract exists (bytecode length: ${code.length})`);
    
    // 创建合约实例
    const contract = new ethers.Contract(contractAddress, ABI, provider);
    
    // 获取记录统计
    const [dataCount, txCount] = await contract.getRecordCounts();
    console.log(`\n📊 Contract Statistics:`);
    console.log(`   Data Records: ${dataCount}`);
    console.log(`   Transaction Records: ${txCount}`);
    
    // 获取当前区块
    const blockNumber = await provider.getBlockNumber();
    console.log(`\n⛓️  Current Block: ${blockNumber}`);
    
    // 查询最近的事件
    console.log(`\n📜 Recent Events (last 100 blocks):`);
    const fromBlock = Math.max(0, blockNumber - 100);
    
    // 查询 DataStored 事件
    const dataEvents = await contract.queryFilter("DataStored", fromBlock, "latest");
    console.log(`   DataStored events: ${dataEvents.length}`);
    
    // 查询 TransactionLogged 事件
    const txEvents = await contract.queryFilter("TransactionLogged", fromBlock, "latest");
    console.log(`   TransactionLogged events: ${txEvents.length}`);
    
    // 显示最新的事件
    if (dataEvents.length > 0) {
      const latest = dataEvents[dataEvents.length - 1];
      console.log(`\n   Latest DataStored:`);
      console.log(`     Block: ${latest.blockNumber}`);
      console.log(`     TX: ${latest.transactionHash}`);
    }
    
    if (txEvents.length > 0) {
      const latest = txEvents[txEvents.length - 1];
      console.log(`\n   Latest TransactionLogged:`);
      console.log(`     Block: ${latest.blockNumber}`);
      console.log(`     TX: ${latest.transactionHash}`);
    }
    
    console.log(`\n✅ Contract verification complete!`);
    
    // 提供区块浏览器链接
    if (network === "sepolia") {
      console.log(`\n🔗 View on Etherscan:`);
      console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
    }
    
  } catch (error) {
    console.error(`\n❌ Verification failed:`, error);
  }
}

// 从命令行参数获取网络
const network = process.argv[2] || "sepolia";
verifyContract(network);
