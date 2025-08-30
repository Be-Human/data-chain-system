import { ethers } from 'ethers';

// 配置
const ALCHEMY_KEY = 'YOUR_ALCHEMY_KEY'; // 替换成你的 key
const CONTRACT_ADDRESS = '0xEd05Da57AE62F71FE11e8643fF6a874919cD0c7d';

// ABI (只需要事件定义)
const ABI = [
  'event DataStored(uint256 indexed recordId, address indexed sender, string indexed category, string data, uint256 timestamp)',
  'event TransactionLogged(uint256 indexed recordId, address indexed from, address indexed to, uint256 amount, string memo, uint256 timestamp)'
];

async function checkEvents() {
  // 连接到 Sepolia
  const provider = new ethers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
  );

  // 创建合约实例
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log('Checking contract:', CONTRACT_ADDRESS);
  console.log('Current block:', await provider.getBlockNumber());

  // 查询 DataStored 事件
  console.log('\n=== DataStored Events ===');
  const dataStoredEvents = await contract.queryFilter('DataStored', 0, 'latest');
  console.log(`Found ${dataStoredEvents.length} DataStored events`);
  
  dataStoredEvents.forEach((event, i) => {
    console.log(`\nEvent ${i + 1}:`);
    console.log('  Block:', event.blockNumber);
    console.log('  Transaction:', event.transactionHash);
    console.log('  Args:', event.args);
  });

  // 查询 TransactionLogged 事件
  console.log('\n=== TransactionLogged Events ===');
  const txLoggedEvents = await contract.queryFilter('TransactionLogged', 0, 'latest');
  console.log(`Found ${txLoggedEvents.length} TransactionLogged events`);
  
  txLoggedEvents.forEach((event, i) => {
    console.log(`\nEvent ${i + 1}:`);
    console.log('  Block:', event.blockNumber);
    console.log('  Transaction:', event.transactionHash);
    console.log('  Args:', event.args);
  });
}

checkEvents().catch(console.error);
