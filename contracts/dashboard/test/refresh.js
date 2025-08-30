// 快速刷新脚本 - 在浏览器控制台运行

// 刷新交易列表
async function refreshTransactions() {
    console.log('刷新交易列表...');
    await TransactionsModule.loadRecentTransactions();
    TransactionsModule.render();
    console.log('交易列表已刷新，共', TransactionsModule.transactions.length, '条交易');
    
    // 显示交易详情
    TransactionsModule.transactions.forEach((tx, i) => {
        console.log(`交易 ${i}:`, {
            hash: tx.hash,
            from: tx.from,
            to: tx.to || '合约创建',
            value: ethers.formatEther(tx.value) + ' ETH'
        });
    });
}

// 刷新合约列表
async function refreshContracts() {
    console.log('刷新合约列表...');
    await ContractsModule.detectDeployedContracts();
    ContractsModule.render();
    console.log('合约列表已刷新，共', ContractsModule.contracts.length, '个合约');
}

// 完整刷新所有模块
async function refreshAll() {
    console.log('=== 刷新所有模块 ===');
    
    // 刷新账户
    await AccountsModule.updateBalances();
    console.log('✓ 账户已更新');
    
    // 刷新区块
    await BlocksModule.loadRecentBlocks();
    BlocksModule.render();
    console.log('✓ 区块已更新');
    
    // 刷新交易
    await refreshTransactions();
    console.log('✓ 交易已更新');
    
    // 刷新合约
    await refreshContracts();
    console.log('✓ 合约已更新');
    
    console.log('=== 刷新完成 ===');
}

// 测试交易详情
async function testTransactionDetails() {
    const txs = TransactionsModule.transactions;
    if (txs.length > 0) {
        const firstTx = txs[0];
        console.log('测试第一个交易的详情:', firstTx.hash);
        await TransactionsModule.viewTransactionDetails(firstTx.hash);
    } else {
        console.log('没有交易可测试');
    }
}

console.log('可用命令:');
console.log('- refreshTransactions() : 刷新交易列表');
console.log('- refreshContracts() : 刷新合约列表');
console.log('- refreshAll() : 刷新所有模块');
console.log('- testTransactionDetails() : 测试交易详情');
