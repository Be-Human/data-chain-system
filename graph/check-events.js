const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider(
  'https://eth-sepolia.g.alchemy.com/v2/3PrGKvl8GUljNI7gLRRNT'
);

const contractAddress = '0xEd05Da57AE62F71FE11e8643fF6a874919cD0c7d';

const abi = [
  'event DataStored(uint256 indexed recordId, address indexed sender, string indexed category, string data, uint256 timestamp)',
  'event TransactionLogged(uint256 indexed recordId, address indexed from, address indexed to, uint256 amount, string memo, uint256 timestamp)'
];

async function checkEvents() {
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  console.log('Checking for events in blocks 9088000-9090000...\n');
  
  let allDataEvents = [];
  let allTxEvents = [];
  
  // 分批查询，每批 500 个区块
  const ranges = [
    [9088000, 9088499],
    [9088500, 9088999],
    [9089000, 9089499],
    [9089500, 9090000]
  ];
  
  for (const [start, end] of ranges) {
    console.log(`Scanning blocks ${start} to ${end}...`);
    
    try {
      // 查询 DataStored 事件
      const dataEvents = await contract.queryFilter('DataStored', start, end);
      allDataEvents = allDataEvents.concat(dataEvents);
      
      // 查询 TransactionLogged 事件
      const txEvents = await contract.queryFilter('TransactionLogged', start, end);
      allTxEvents = allTxEvents.concat(txEvents);
      
      if (dataEvents.length > 0 || txEvents.length > 0) {
        console.log(`  ✅ Found ${dataEvents.length} DataStored, ${txEvents.length} TransactionLogged events`);
      }
    } catch (error) {
      console.error(`  ❌ Error scanning range: ${error.message}`);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total DataStored events: ${allDataEvents.length}`);
  console.log(`Total TransactionLogged events: ${allTxEvents.length}`);
  
  if (allDataEvents.length > 0) {
    console.log('\n=== DataStored Events ===');
    allDataEvents.forEach((event, i) => {
      console.log(`\nEvent ${i + 1}:`);
      console.log('  Block:', event.blockNumber);
      console.log('  TX:', event.transactionHash);
      console.log('  RecordId:', event.args.recordId.toString());
      console.log('  Sender:', event.args.sender);
      console.log('  Category:', event.args.category);
      console.log('  Data:', event.args.data.substring(0, 100) + '...');
    });
  }
  
  if (allTxEvents.length > 0) {
    console.log('\n=== TransactionLogged Events ===');
    allTxEvents.forEach((event, i) => {
      console.log(`\nEvent ${i + 1}:`);
      console.log('  Block:', event.blockNumber);
      console.log('  TX:', event.transactionHash);
      console.log('  From:', event.args.from);
      console.log('  To:', event.args.to);
      console.log('  Amount:', ethers.formatEther(event.args.amount), 'ETH');
      console.log('  Memo:', event.args.memo);
    });
  }
  
  if (allDataEvents.length === 0 && allTxEvents.length === 0) {
    console.log('\n❌ No events found in the specified range!');
    console.log('This explains why The Graph has no data.');
    console.log('\n💡 Solution: Upload some data through the frontend first!');
  }
}

checkEvents().catch(console.error);
