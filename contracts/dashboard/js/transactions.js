// 交易管理模块
const TransactionsModule = {
    transactions: [],
    maxTransactions: 50,
    
    // 初始化
    init: async function() {
        console.log('Initializing transactions module... - transactions.js:8');
        await this.loadRecentTransactions();
        this.render();
    },
    
    // 加载最近的交易
    loadRecentTransactions: async function() {
        try {
            this.transactions = [];
            const currentBlockNumber = await provider.getBlockNumber();
            
            // 从最近的几个区块加载交易
            for (let i = currentBlockNumber; i > Math.max(0, currentBlockNumber - 5); i--) {
                const block = await provider.getBlock(i, false); // false = 只获取交易哈希
                
                if (block && block.transactions && block.transactions.length > 0) {
                    for (const txHash of block.transactions) {
                        // 获取完整的交易对象
                        const tx = await provider.getTransaction(txHash);
                        
                        if (!tx) continue;
                        
                        // 安全处理可能为 null/undefined 的字段
                        const txData = {
                            hash: tx.hash || txHash,
                            blockNumber: tx.blockNumber || 0,
                            from: tx.from || '',
                            to: tx.to || null, // to 可能为 null (合约创建)
                            value: tx.value ? tx.value.toString() : '0',
                            gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',
                            gasLimit: tx.gasLimit ? tx.gasLimit.toString() : '0',
                            maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toString() : null,
                            maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? tx.maxPriorityFeePerGas.toString() : null,
                            nonce: tx.nonce || 0,
                            data: tx.data || '0x',
                            timestamp: block.timestamp || Math.floor(Date.now() / 1000),
                            status: 'success' // Hardhat 本地交易通常都成功
                        };
                        
                        this.transactions.push(txData);
                        
                        if (this.transactions.length >= this.maxTransactions) {
                            break;
                        }
                    }
                }
                
                if (this.transactions.length >= this.maxTransactions) {
                    break;
                }
            }
            
            console.log(`Loaded ${this.transactions.length} transactions - transactions.js:55`);
        } catch (error) {
            console.error('Failed to load transactions: - transactions.js:57', error);
            // 不要让错误阻止初始化
            this.transactions = [];
        }
    },
    
    // 从区块加载交易
    loadTransactionsFromBlock: async function(block) {
        if (!block || !block.transactions) return;
        
        try {
            for (const tx of block.transactions) {
                // 如果是交易哈希，获取完整交易
                const transaction = typeof tx === 'string' ? 
                    await provider.getTransaction(tx) : tx;
                
                if (transaction) {
                    const txData = {
                        hash: transaction.hash || '',
                        blockNumber: transaction.blockNumber || 0,
                        from: transaction.from || '',
                        to: transaction.to || null,
                        value: transaction.value ? transaction.value.toString() : '0',
                        gasPrice: transaction.gasPrice ? transaction.gasPrice.toString() : '0',
                        gasLimit: transaction.gasLimit ? transaction.gasLimit.toString() : '0',
                        maxFeePerGas: transaction.maxFeePerGas ? transaction.maxFeePerGas.toString() : null,
                        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? transaction.maxPriorityFeePerGas.toString() : null,
                        nonce: transaction.nonce || 0,
                        data: transaction.data || '0x',
                        timestamp: block.timestamp || Math.floor(Date.now() / 1000),
                        status: 'success'
                    };
                    
                    // 添加到开头
                    this.transactions.unshift(txData);
                    
                    // 保持最大数量
                    if (this.transactions.length > this.maxTransactions) {
                        this.transactions = this.transactions.slice(0, this.maxTransactions);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load transactions from block: - transactions.js:100', error);
        }
        
        // 如果当前在交易标签页，更新显示
        if (!document.getElementById('transactions-panel').classList.contains('hidden')) {
            this.render();
        }
    },
    
    // 渲染交易列表
    render: function() {
        const container = document.getElementById('transactionsList');
        if (!container) return;
        
        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-8 text-center">
                    <i class="fas fa-exchange-alt text-4xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400">暂无交易记录</p>
                    <button 
                        onclick="TransactionsModule.createTestTransaction()"
                        class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                        创建测试交易
                    </button>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="space-y-4">
                ${this.transactions.map((tx, index) => {
                    // 安全处理可能的 null 值
                    const toAddress = tx.to ? Utils.formatAddress(tx.to) : '合约创建';
                    const gasPrice = tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : '0';
                    
                    return `
                        <div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <span class="text-gray-400 text-sm">交易哈希:</span>
                                        <code class="text-blue-400 text-sm font-mono">${Utils.formatHash(tx.hash)}</code>
                                        <button onclick="Utils.copyToClipboard('${tx.hash}', this)" class="text-gray-400 hover:text-white">
                                            <i class="fas fa-copy text-xs"></i>
                                        </button>
                                        ${tx.status === 'success' ? 
                                            '<span class="bg-green-600 text-white text-xs px-2 py-1 rounded">成功</span>' :
                                            '<span class="bg-red-600 text-white text-xs px-2 py-1 rounded">失败</span>'
                                        }
                                    </div>
                                    
                                    <div class="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span class="text-gray-400">发送方:</span>
                                            <code class="text-white ml-2">${Utils.formatAddress(tx.from)}</code>
                                        </div>
                                        <div>
                                            <span class="text-gray-400">接收方:</span>
                                            <code class="text-white ml-2">${toAddress}</code>
                                        </div>
                                    </div>
                                    
                                    <div class="grid grid-cols-3 gap-4 text-sm mt-2">
                                        <div>
                                            <span class="text-gray-400">金额:</span>
                                            <span class="text-white ml-2">${Utils.formatEther(tx.value)} ETH</span>
                                        </div>
                                        <div>
                                            <span class="text-gray-400">Gas Price:</span>
                                            <span class="text-white ml-2">${gasPrice} Gwei</span>
                                        </div>
                                        <div>
                                            <span class="text-gray-400">区块:</span>
                                            <span class="text-blue-400 ml-2">#${tx.blockNumber}</span>
                                        </div>
                                    </div>
                                    
                                    ${tx.data && tx.data !== '0x' && tx.data !== '0x0' ? `
                                        <div class="mt-2">
                                            <span class="text-gray-400 text-sm">Input Data:</span>
                                            <code class="text-gray-500 text-xs block mt-1 break-all">
                                                ${tx.data.substring(0, 66)}${tx.data.length > 66 ? '...' : ''}
                                            </code>
                                        </div>
                                    ` : ''}
                                </div>
                                
                                <div class="text-right">
                                    <div class="text-gray-400 text-xs">${BlocksModule.formatTime(tx.timestamp)}</div>
                                    ${tx.hash && tx.hash !== '' ? `
                                    <button 
                                        onclick="TransactionsModule.viewTransactionDetails('${tx.hash}')"
                                        class="mt-2 text-blue-400 hover:text-blue-300 text-sm">
                                        详情 <i class="fas fa-arrow-right ml-1"></i>
                                    </button>
                                    ` : `
                                    <span class="text-gray-500 text-sm">无哈希</span>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    // 创建测试交易
    createTestTransaction: async function() {
        try {
            if (!signer) {
                showToast('没有可用的签名账户', 'error');
                return;
            }
            
            showToast('正在发送交易...', 'info');
            
            // 发送测试交易
            const tx = await signer.sendTransaction({
                to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                value: ethers.parseEther('1.0')
            });
            
            showToast(`交易已发送: ${tx.hash.substring(0, 10)}...`, 'success');
            
            // 等待确认
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                showToast('交易已确认', 'success');
            } else {
                showToast('交易失败', 'error');
            }
            
            // 刷新交易列表
            await this.loadRecentTransactions();
            this.render();
            
            // 刷新账户余额
            await AccountsModule.updateBalances();
            
        } catch (error) {
            console.error('Transaction failed: - transactions.js:241', error);
            showToast('交易失败: ' + (error.message || '未知错误'), 'error');
        }
    },
    
    // 查看交易详情
viewTransactionDetails: async function(hash) {
    try {
        if (!hash || hash === 'undefined' || hash === '') {
            showToast('无效的交易哈希', 'error');
            return;
        }
        
        // 先从本地数据查找
        const tx = this.transactions.find(t => t.hash === hash);
        
        // 如果本地没有，从链上获取
        const chainTx = await provider.getTransaction(hash);
        const receipt = await provider.getTransactionReceipt(hash);
        
        if (!chainTx || !receipt) {
            showToast('交易未找到', 'error');
            return;
        }
        
        // 构建详情信息
        const details = {
            hash: chainTx.hash,
            from: chainTx.from,
            to: chainTx.to || '合约创建',
            value: ethers.formatEther(chainTx.value || '0'),
            gasPrice: chainTx.gasPrice ? ethers.formatUnits(chainTx.gasPrice, 'gwei') : 'N/A',
            gasLimit: chainTx.gasLimit ? chainTx.gasLimit.toString() : 'N/A',
            gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : 'N/A',
            nonce: chainTx.nonce,
            blockNumber: receipt.blockNumber,
            status: receipt.status === 1 ? '成功' : '失败',
            contractAddress: receipt.contractAddress || null
        };
        
        // 显示详情（暂时用 alert，后续可以改成模态框）
        const info = `
交易详情
========
哈希: ${details.hash}
状态: ${details.status}
发送方: ${details.from}
接收方: ${details.to}
金额: ${details.value} ETH
Gas 使用: ${details.gasUsed} / ${details.gasLimit}
Gas 价格: ${details.gasPrice} Gwei
区块: #${details.blockNumber}
${details.contractAddress ? `合约地址: ${details.contractAddress}` : ''}
        `;
        
        console.log('Transaction Details: - transactions.js:292', details);
        alert(info);
        
        // 如果是合约创建，提示添加到合约列表
        if (receipt.contractAddress) {
            if (confirm('检测到合约部署，是否添加到合约列表？')) {
                ContractsModule.addContract({
                    address: receipt.contractAddress,
                    deployTx: chainTx.hash,
                    deployer: chainTx.from,
                    blockNumber: receipt.blockNumber,
                    name: 'Unknown Contract',
                    abi: []
                });
                showToast('合约已添加', 'success');
            }
        }
        
    } catch (error) {
        console.error('Failed to get transaction details: - transactions.js:311', error);
        showToast('获取交易详情失败: ' + error.message, 'error');
    }
},
    
    // 刷新
    refresh: async function() {
        await this.loadRecentTransactions();
        this.render();
    }
};