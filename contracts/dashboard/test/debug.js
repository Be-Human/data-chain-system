// 调试脚本 - 在浏览器控制台运行

// 测试合约检测
async function debugContractDetection() {
    console.log('=== 开始调试合约检测 ===');
    
    const currentBlockNumber = await provider.getBlockNumber();
    console.log('当前区块号:', currentBlockNumber);
    
    // 检查每个区块
    for (let i = 1; i <= currentBlockNumber; i++) {
        console.log(`\n--- 区块 ${i} ---`);
        
        // 方式1: 获取区块（不包含完整交易）
        const blockWithoutTx = await provider.getBlock(i, false);
        console.log('交易哈希列表:', blockWithoutTx.transactions);
        
        // 方式2: 获取区块（包含完整交易） 
        const blockWithTx = await provider.getBlock(i, true);
        console.log('完整交易对象:', blockWithTx.transactions);
        
        // 检查每个交易
        for (const txHash of blockWithoutTx.transactions) {
            const tx = await provider.getTransaction(txHash);
            const receipt = await provider.getTransactionReceipt(txHash);
            
            console.log('交易详情:', {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                isContractCreation: tx.to === null,
                contractAddress: receipt.contractAddress
            });
            
            if (tx.to === null) {
                console.log('🎯 发现合约创建交易!');
                console.log('合约地址:', receipt.contractAddress);
            }
        }
    }
}

// 测试交易加载
async function debugTransactions() {
    console.log('=== 测试交易加载 ===');
    
    const currentBlockNumber = await provider.getBlockNumber();
    
    for (let i = currentBlockNumber; i > Math.max(0, currentBlockNumber - 2); i--) {
        const block = await provider.getBlock(i, true);
        console.log(`Block ${i}:`, block);
        
        if (block && block.transactions) {
            console.log(`Block ${i} has ${block.transactions.length} transactions`);
            
            for (const tx of block.transactions) {
                console.log('Transaction type:', typeof tx);
                console.log('Transaction:', tx);
                
                // 如果是字符串（哈希），获取完整交易
                if (typeof tx === 'string') {
                    const fullTx = await provider.getTransaction(tx);
                    console.log('Full transaction:', fullTx);
                }
            }
        }
    }
}

// 手动添加检测到的合约
async function manuallyAddContract(address, txHash) {
    const receipt = await provider.getTransactionReceipt(txHash);
    const tx = await provider.getTransaction(txHash);
    
    if (receipt && receipt.contractAddress) {
        ContractsModule.addContract({
            address: receipt.contractAddress,
            deployTx: txHash,
            deployer: tx.from,
            blockNumber: receipt.blockNumber,
            name: 'Manually Added Contract',
            abi: []
        });
        
        console.log('合约已添加:', receipt.contractAddress);
        showToast('合约已添加', 'success');
    }
}

// 运行测试
console.log('运行: debugContractDetection() 来调试合约检测');
console.log('运行: debugTransactions() 来调试交易加载');
console.log('运行: manuallyAddContract(address, txHash) 来手动添加合约');
