// 事件管理模块
const EventsModule = {
    events: [],
    maxEvents: 100,
    eventFilters: {},
    watchedContracts: new Set(),
    
    // 初始化
    init: async function() {
        console.log('Initializing events module... - events.js:10');
        await this.loadRecentEvents();
        this.setupEventListeners();
        this.render();
    },
    
    // 加载最近的事件
    loadRecentEvents: async function() {
        try {
            this.events = [];
            const currentBlockNumber = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlockNumber - 100);
            
            // 获取所有合约
            const contracts = ContractsModule.contracts;
            
            for (const contract of contracts) {
                if (!contract.abi || contract.abi.length === 0) continue;
                
                try {
                    const contractInstance = new ethers.Contract(
                        contract.address,
                        contract.abi,
                        provider
                    );
                    
                    // 获取所有事件
                    const events = contract.abi.filter(item => item.type === 'event');
                    
                    for (const eventAbi of events) {
                        const filter = contractInstance.filters[eventAbi.name];
                        if (!filter) continue;
                        
                        const logs = await contractInstance.queryFilter(
                            filter(),
                            fromBlock,
                            currentBlockNumber
                        );
                        
                        for (const log of logs) {
                            this.events.push({
                                id: Utils.generateId(),
                                contractAddress: contract.address,
                                contractName: contract.name,
                                eventName: eventAbi.name,
                                blockNumber: log.blockNumber,
                                transactionHash: log.transactionHash,
                                logIndex: log.logIndex,
                                args: this.parseEventArgs(log.args, eventAbi),
                                removed: log.removed,
                                timestamp: Date.now() // 将被更新为实际区块时间
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Failed to load events for contract ${contract.address}: - events.js:65`, error);
                }
            }
            
            // 按区块号排序（最新的在前）
            this.events.sort((a, b) => b.blockNumber - a.blockNumber);
            
            // 限制数量
            if (this.events.length > this.maxEvents) {
                this.events = this.events.slice(0, this.maxEvents);
            }
            
            // 获取时间戳
            await this.updateEventTimestamps();
            
            console.log(`Loaded ${this.events.length} events - events.js:80`);
        } catch (error) {
            console.error('Failed to load events: - events.js:82', error);
        }
    },
    
    // 解析事件参数
    parseEventArgs: function(args, eventAbi) {
        const parsed = {};
        
        if (!eventAbi.inputs) return parsed;
        
        eventAbi.inputs.forEach((input, index) => {
            const value = args[index];
            
            // 转换不同类型的值
            if (typeof value === 'bigint') {
                parsed[input.name] = value.toString();
            } else if (value instanceof ethers.Result) {
                parsed[input.name] = value.toArray();
            } else {
                parsed[input.name] = value;
            }
            
            // 添加类型信息
            parsed[input.name + '_type'] = input.type;
        });
        
        return parsed;
    },
    
    // 更新事件时间戳
    updateEventTimestamps: async function() {
        const blockNumbers = [...new Set(this.events.map(e => e.blockNumber))];
        const blockTimestamps = {};
        
        for (const blockNumber of blockNumbers) {
            try {
                const block = await provider.getBlock(blockNumber);
                if (block) {
                    blockTimestamps[blockNumber] = block.timestamp;
                }
            } catch (error) {
                console.error(`Failed to get block ${blockNumber}: - events.js:123`, error);
            }
        }
        
        this.events.forEach(event => {
            if (blockTimestamps[event.blockNumber]) {
                event.timestamp = blockTimestamps[event.blockNumber] * 1000;
            }
        });
    },
    
    // 设置事件监听器
    setupEventListeners: function() {
        // 监听新区块，检查新事件
        provider.on('block', async (blockNumber) => {
            await this.checkNewEvents(blockNumber);
        });
    },
    
    // 检查新事件
    checkNewEvents: async function(blockNumber) {
        const contracts = ContractsModule.contracts;
        
        for (const contract of contracts) {
            if (!contract.abi || contract.abi.length === 0) continue;
            if (!this.watchedContracts.has(contract.address)) continue;
            
            try {
                const contractInstance = new ethers.Contract(
                    contract.address,
                    contract.abi,
                    provider
                );
                
                const events = contract.abi.filter(item => item.type === 'event');
                
                for (const eventAbi of events) {
                    const filter = contractInstance.filters[eventAbi.name];
                    if (!filter) continue;
                    
                    const logs = await contractInstance.queryFilter(
                        filter(),
                        blockNumber,
                        blockNumber
                    );
                    
                    for (const log of logs) {
                        const eventData = {
                            id: Utils.generateId(),
                            contractAddress: contract.address,
                            contractName: contract.name,
                            eventName: eventAbi.name,
                            blockNumber: log.blockNumber,
                            transactionHash: log.transactionHash,
                            logIndex: log.logIndex,
                            args: this.parseEventArgs(log.args, eventAbi),
                            removed: log.removed,
                            timestamp: Date.now()
                        };
                        
                        // 添加到开头
                        this.events.unshift(eventData);
                        
                        // 显示通知
                        showToast(`新事件: ${contract.name}.${eventAbi.name}`, 'info');
                        
                        // 更新控制台
                        this.logToConsole(`EVENT: ${contract.name}.${eventAbi.name}`, eventData.args);
                    }
                }
            } catch (error) {
                console.error(`Failed to check events for contract ${contract.address}: - events.js:194`, error);
            }
        }
        
        // 限制数量
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }
        
        // 如果当前在事件标签页，更新显示
        if (!document.getElementById('events-panel').classList.contains('hidden')) {
            this.render();
        }
    },
    
    // 渲染事件列表
    render: function() {
        const container = document.getElementById('eventsList');
        if (!container) return;
        
        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-8 text-center">
                    <i class="fas fa-bell text-4xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400 mb-4">暂无事件记录</p>
                    <p class="text-sm text-gray-500">部署合约并触发事件后，这里将显示事件日志</p>
                    ${ContractsModule.contracts.length > 0 ? `
                        <div class="mt-4">
                            <button 
                                onclick="EventsModule.startWatching()"
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                                <i class="fas fa-eye mr-2"></i>开始监听所有合约
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="mb-4 flex justify-between items-center">
                <div class="text-gray-400">
                    共 ${this.events.length} 个事件
                </div>
                <div class="space-x-2">
                    <button 
                        onclick="EventsModule.clearEvents()"
                        class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                        <i class="fas fa-trash mr-1"></i>清空
                    </button>
                    <button 
                        onclick="EventsModule.exportEvents()"
                        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                        <i class="fas fa-download mr-1"></i>导出
                    </button>
                </div>
            </div>
            
            <div class="space-y-3">
                ${this.events.map(event => `
                    <div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center space-x-2">
                                <span class="bg-blue-600 text-white text-sm px-2 py-1 rounded">
                                    ${event.eventName}
                                </span>
                                <span class="text-gray-400 text-sm">
                                    ${event.contractName}
                                </span>
                            </div>
                            <span class="text-gray-500 text-xs">
                                ${new Date(event.timestamp).toLocaleString('zh-CN')}
                            </span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                                <span class="text-gray-400">合约:</span>
                                <code class="text-white ml-2">${Utils.formatAddress(event.contractAddress)}</code>
                            </div>
                            <div>
                                <span class="text-gray-400">区块:</span>
                                <span class="text-blue-400 ml-2">#${event.blockNumber}</span>
                            </div>
                        </div>
                        
                        <div class="text-sm mb-2">
                            <span class="text-gray-400">交易:</span>
                            <code class="text-blue-400 ml-2">${Utils.formatHash(event.transactionHash)}</code>
                        </div>
                        
                        ${Object.keys(event.args).length > 0 ? `
                            <div class="mt-3 pt-3 border-t border-gray-700">
                                <div class="text-sm text-gray-400 mb-2">参数:</div>
                                <div class="bg-gray-900 rounded p-2 text-xs font-mono">
                                    ${Object.entries(event.args)
                                        .filter(([key]) => !key.endsWith('_type'))
                                        .map(([key, value]) => {
                                            const type = event.args[key + '_type'] || 'unknown';
                                            return `<div class="mb-1">
                                                <span class="text-yellow-400">${key}</span>
                                                <span class="text-gray-500">(${type}):</span>
                                                <span class="text-white">${this.formatValue(value, type)}</span>
                                            </div>`;
                                        }).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    // 格式化值
    formatValue: function(value, type) {
        if (type.includes('address')) {
            return Utils.formatAddress(value);
        } else if (type.includes('uint') || type.includes('int')) {
            // 尝试转换为 ETH（假设是 wei）
            try {
                const eth = ethers.formatEther(value);
                const num = parseFloat(eth);
                if (num > 0.0001) {
                    return `${num} ETH`;
                }
            } catch {}
            return value.toString();
        } else if (type === 'bool') {
            return value ? 'true' : 'false';
        } else if (type.includes('bytes')) {
            return Utils.formatHash(value);
        }
        return value.toString();
    },
    
    // 开始监听所有合约
    startWatching: function() {
        const contracts = ContractsModule.contracts;
        contracts.forEach(contract => {
            this.watchedContracts.add(contract.address);
        });
        showToast(`开始监听 ${contracts.length} 个合约的事件`, 'success');
    },
    
    // 清空事件
    clearEvents: function() {
        if (confirm('确定要清空所有事件记录吗？')) {
            this.events = [];
            this.render();
            showToast('事件已清空', 'success');
        }
    },
    
    // 导出事件
    exportEvents: function() {
        const data = {
            events: this.events,
            exportTime: new Date().toISOString(),
            totalEvents: this.events.length
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `events_${Date.now()}.json`;
        a.click();
        
        showToast('事件已导出', 'success');
    },
    
    // 记录到控制台
    logToConsole: function(message, data) {
        const consoleOutput = document.getElementById('consoleOutput');
        if (consoleOutput) {
            const entry = document.createElement('div');
            entry.className = 'mb-2 text-green-400';
            entry.innerHTML = `
                <span class="text-gray-500">[${new Date().toLocaleTimeString()}]</span>
                <span class="ml-2">${message}</span>
                ${data ? `<pre class="text-xs text-gray-400 mt-1">${JSON.stringify(data, null, 2)}</pre>` : ''}
            `;
            consoleOutput.insertBefore(entry, consoleOutput.firstChild);
            
            // 限制日志数量
            while (consoleOutput.children.length > 100) {
                consoleOutput.removeChild(consoleOutput.lastChild);
            }
        }
    },
    
    // 刷新
    refresh: async function() {
        await this.loadRecentEvents();
        this.render();
    }
};