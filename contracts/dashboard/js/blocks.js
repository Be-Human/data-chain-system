// 区块管理模块
const BlocksModule = {
    blocks: [],
    maxBlocks: 20, // 最多显示20个区块
    
    // 初始化
    init: async function() {
        console.log('Initializing blocks module... - blocks.js:8');
        await this.loadRecentBlocks();
        this.render();
    },
    
    // 加载最近的区块
    loadRecentBlocks: async function() {
        try {
            const currentBlockNumber = await provider.getBlockNumber();
            this.blocks = [];
            
            // 加载最近10个区块
            const startBlock = Math.max(0, currentBlockNumber - 9);
            
            for (let i = currentBlockNumber; i >= startBlock; i--) {
                const block = await provider.getBlock(i, false); // false = 不包含完整交易
                
                if (block) {
                    this.blocks.push({
                        number: block.number,
                        hash: block.hash,
                        parentHash: block.parentHash,
                        timestamp: block.timestamp,
                        miner: block.miner,
                        gasLimit: block.gasLimit.toString(),
                        gasUsed: block.gasUsed.toString(),
                        baseFeePerGas: block.baseFeePerGas ? block.baseFeePerGas.toString() : '0',
                        transactions: block.transactions,
                        txCount: block.transactions.length
                    });
                }
            }
            
            console.log(`Loaded ${this.blocks.length} blocks - blocks.js:41`);
        } catch (error) {
            console.error('Failed to load blocks: - blocks.js:43', error);
        }
    },
    
    // 渲染区块列表
    render: function() {
        const container = document.getElementById('blocksList');
        if (!container) return;
        
        if (this.blocks.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-8 text-center">
                    <i class="fas fa-cubes text-4xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400">暂无区块数据</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-gray-700">
                            <th class="text-left py-3 px-4 text-gray-400 font-medium">区块号</th>
                            <th class="text-left py-3 px-4 text-gray-400 font-medium">时间</th>
                            <th class="text-left py-3 px-4 text-gray-400 font-medium">交易数</th>
                            <th class="text-left py-3 px-4 text-gray-400 font-medium">Gas 使用</th>
                            <th class="text-left py-3 px-4 text-gray-400 font-medium">Gas 限制</th>
                            <th class="text-left py-3 px-4 text-gray-400 font-medium">Base Fee</th>
                            <th class="text-left py-3 px-4 text-gray-400 font-medium">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.blocks.map(block => `
                            <tr class="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                <td class="py-3 px-4">
                                    <div class="flex items-center space-x-2">
                                        <span class="text-blue-400 font-mono">#${block.number}</span>
                                        ${block.number === this.blocks[0].number ? 
                                            '<span class="bg-green-600 text-white text-xs px-2 py-1 rounded">最新</span>' : 
                                            ''
                                        }
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-gray-400">
                                    ${this.formatTime(block.timestamp)}
                                </td>
                                <td class="py-3 px-4">
                                    <span class="bg-gray-700 px-2 py-1 rounded text-sm">
                                        ${block.txCount} 笔
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-gray-400">
                                    ${Utils.formatGas(block.gasUsed)}
                                </td>
                                <td class="py-3 px-4 text-gray-400">
                                    ${Utils.formatGas(block.gasLimit)}
                                </td>
                                <td class="py-3 px-4 text-gray-400">
                                    ${block.baseFeePerGas ? ethers.formatUnits(block.baseFeePerGas, 'gwei') + ' Gwei' : '-'}
                                </td>
                                <td class="py-3 px-4">
                                    <button 
                                        onclick="BlocksModule.viewBlockDetails(${block.number})"
                                        class="text-blue-400 hover:text-blue-300 transition-colors">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- 区块详情模态框 -->
            <div id="blockDetailsModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">区块详情</h3>
                        <button onclick="BlocksModule.closeBlockDetails()" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="blockDetailsContent"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    // 格式化时间
    formatTime: function(timestamp) {
        const now = Date.now() / 1000;
        const diff = now - timestamp;
        
        if (diff < 60) {
            return `${Math.floor(diff)} 秒前`;
        } else if (diff < 3600) {
            return `${Math.floor(diff / 60)} 分钟前`;
        } else if (diff < 86400) {
            return `${Math.floor(diff / 3600)} 小时前`;
        } else {
            return new Date(timestamp * 1000).toLocaleString('zh-CN');
        }
    },
    
    // 处理新区块
    onNewBlock: async function(blockNumber) {
        try {
            const block = await provider.getBlock(blockNumber, false);
            
            if (block) {
                const blockData = {
                    number: block.number,
                    hash: block.hash,
                    parentHash: block.parentHash,
                    timestamp: block.timestamp,
                    miner: block.miner,
                    gasLimit: block.gasLimit.toString(),
                    gasUsed: block.gasUsed.toString(),
                    baseFeePerGas: block.baseFeePerGas ? block.baseFeePerGas.toString() : '0',
                    transactions: block.transactions,
                    txCount: block.transactions.length
                };
                
                // 添加到开头
                this.blocks.unshift(blockData);
                
                // 保持最大数量
                if (this.blocks.length > this.maxBlocks) {
                    this.blocks = this.blocks.slice(0, this.maxBlocks);
                }
                
                // 如果当前在区块标签页，更新显示
                if (!document.getElementById('blocks-panel').classList.contains('hidden')) {
                    this.render();
                }
                
                // 显示通知
                showToast(`新区块 #${blockNumber} (${block.transactions.length} 笔交易)`, 'info');
                
                // 更新交易模块
                if (block.transactions.length > 0) {
                    await TransactionsModule.loadTransactionsFromBlock(block);
                }
            }
        } catch (error) {
            console.error('Failed to process new block: - blocks.js:192', error);
        }
    },
    
    // 查看区块详情
    viewBlockDetails: async function(blockNumber) {
        const block = this.blocks.find(b => b.number === blockNumber);
        if (!block) return;
        
        const modal = document.getElementById('blockDetailsModal');
        const content = document.getElementById('blockDetailsContent');
        
        content.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-gray-400 text-sm">区块高度</label>
                        <div class="text-white font-mono">${block.number}</div>
                    </div>
                    <div>
                        <label class="text-gray-400 text-sm">时间戳</label>
                        <div class="text-white">${new Date(block.timestamp * 1000).toLocaleString('zh-CN')}</div>
                    </div>
                </div>
                
                <div>
                    <label class="text-gray-400 text-sm">区块哈希</label>
                    <div class="flex items-center space-x-2">
                        <code class="text-white font-mono text-sm break-all">${block.hash}</code>
                        <button onclick="Utils.copyToClipboard('${block.hash}', this)" class="text-gray-400 hover:text-white">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="text-gray-400 text-sm">父区块哈希</label>
                    <div class="flex items-center space-x-2">
                        <code class="text-white font-mono text-sm break-all">${block.parentHash}</code>
                        <button onclick="Utils.copyToClipboard('${block.parentHash}', this)" class="text-gray-400 hover:text-white">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-gray-400 text-sm">Gas 使用</label>
                        <div class="text-white">${Utils.formatGas(block.gasUsed)} / ${Utils.formatGas(block.gasLimit)}</div>
                    </div>
                    <div>
                        <label class="text-gray-400 text-sm">Base Fee</label>
                        <div class="text-white">${block.baseFeePerGas ? ethers.formatUnits(block.baseFeePerGas, 'gwei') + ' Gwei' : '-'}</div>
                    </div>
                </div>
                
                <div>
                    <label class="text-gray-400 text-sm">交易列表 (${block.txCount})</label>
                    <div class="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        ${block.transactions.map(tx => `
                            <div class="bg-gray-900 rounded p-2">
                                <code class="text-xs text-gray-400">${tx}</code>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    },
    
    // 关闭区块详情
    closeBlockDetails: function() {
        document.getElementById('blockDetailsModal').classList.add('hidden');
    },
    
    // 刷新
    refresh: async function() {
        await this.loadRecentBlocks();
        this.render();
    }
};