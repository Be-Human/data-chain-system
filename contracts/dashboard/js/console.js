// 控制台日志管理模块
const ConsoleModule = {
    logs: [],
    maxLogs: 200,
    rpcFilter: new Set(), // 可以添加要过滤的 RPC 方法
    
    // 添加日志
    log: function(type, message, data = null) {
        const logEntry = {
            id: Utils.generateId(),
            type: type, // 'info', 'success', 'warning', 'error', 'rpc'
            message: message,
            data: data,
            timestamp: Date.now()
        };
        
        this.logs.unshift(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        this.renderLog(logEntry);
    },
    
    // 渲染单条日志
    renderLog: function(log) {
        const consoleOutput = document.getElementById('consoleOutput');
        if (!consoleOutput) return;
        
        const colorMap = {
            'info': 'text-blue-400',
            'success': 'text-green-400',
            'warning': 'text-yellow-400',
            'error': 'text-red-400',
            'rpc': 'text-purple-400'
        };
        
        const iconMap = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-times-circle',
            'rpc': 'fa-exchange-alt'
        };
        
        const entry = document.createElement('div');
        entry.className = `mb-2 pb-2 border-b border-gray-800 ${colorMap[log.type] || 'text-gray-400'}`;
        
        // 格式化数据显示
        let dataDisplay = '';
        if (log.data !== null && log.data !== undefined) {
            if (typeof log.data === 'object') {
                try {
                    const formatted = JSON.stringify(log.data, null, 2);
                    dataDisplay = `<div class="text-xs text-gray-500 mt-1 ml-6 font-mono">
                        <pre class="whitespace-pre-wrap break-all">${formatted}</pre>
                    </div>`;
                } catch (e) {
                    dataDisplay = `<div class="text-xs text-gray-500 mt-1 ml-6">${String(log.data)}</div>`;
                }
            } else {
                dataDisplay = `<div class="text-xs text-gray-500 mt-1 ml-6">${String(log.data)}</div>`;
            }
        }
        
        entry.innerHTML = `
            <div class="flex items-start">
                <i class="fas ${iconMap[log.type] || 'fa-circle'} mr-2 mt-0.5"></i>
                <div class="flex-1">
                    <span class="text-gray-500 text-xs">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span class="ml-2">${log.message}</span>
                    ${dataDisplay}
                </div>
            </div>
        `;
        
        consoleOutput.insertBefore(entry, consoleOutput.firstChild);
        
        // 限制显示数量
        while (consoleOutput.children.length > 50) {
            consoleOutput.removeChild(consoleOutput.lastChild);
        }
    },
    
    // 清空日志
    clear: function() {
        this.logs = [];
        const consoleOutput = document.getElementById('consoleOutput');
        if (consoleOutput) {
            consoleOutput.innerHTML = '';
        }
        this.log('info', '📝 控制台已清空');
    },
    
    // 导出日志
    export: function() {
        const data = {
            logs: this.logs,
            exportTime: new Date().toISOString(),
            totalLogs: this.logs.length
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console_logs_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.log('info', '📥 日志已导出');
        showToast('日志已导出', 'success');
    },
    
    // 初始化
    init: function() {
        if (!provider) {
            console.error('Provider not initialized - console.js:119');
            return;
        }
        
        // 拦截 ethers.js 的请求
        this.interceptRPCCalls();
        
        // 添加初始消息
        this.log('info', '🚀 Hardhat Dashboard 已启动');
        this.log('info', `📡 连接到: ${Storage.getSettings().rpcUrl || 'http://localhost:8545'}`);
    },
    
    // 拦截 RPC 调用
    // 拦截 RPC 调用
    interceptRPCCalls: function() {
        if (!provider) return;
        
        // 保存原始方法
        const originalSend = provider.send ? provider.send.bind(provider) : null;
        const originalCall = provider._call ? provider._call.bind(provider) : null;
        const originalPerform = provider._perform ? provider._perform.bind(provider) : null;
        
        // RPC 方法的友好名称
        const friendlyNames = {
            'eth_blockNumber': '📦 获取区块号',
            'eth_getBalance': '💰 查询余额',
            'eth_getTransactionCount': '📊 获取交易数',
            'eth_getBlockByNumber': '📦 获取区块信息',
            'eth_getBlockByHash': '📦 获取区块信息',
            'eth_getTransactionReceipt': '📄 获取交易收据',
            'eth_getTransactionByHash': '📄 获取交易信息',
            'eth_sendTransaction': '💸 发送交易',
            'eth_sendRawTransaction': '💸 发送原始交易',
            'eth_call': '📞 调用合约',
            'eth_estimateGas': '⛽ 估算 Gas',
            'eth_gasPrice': '⛽ 获取 Gas 价格',
            'eth_getLogs': '📝 获取日志',
            'eth_getCode': '📜 获取合约代码',
            'eth_getStorageAt': '💾 获取存储',
            'eth_chainId': '⛓️ 获取链 ID',
            'net_version': '🌐 获取网络版本',
            'eth_accounts': '👥 获取账户列表',
        };
        
        // 高频调用过滤
        const highFrequency = new Set(['eth_blockNumber', 'eth_chainId', 'net_version']);
        
        // 创建拦截函数 - 修复版本
        const intercept = function(originalMethod) {
            return async function(...args) {
                // 获取方法名
                let methodName = '';
                if (typeof args[0] === 'string') {
                    methodName = args[0];
                } else if (args[0] && args[0].method) {
                    methodName = args[0].method;
                }
                
                // 只记录非高频调用
                if (methodName && !highFrequency.has(methodName)) {
                    const displayName = friendlyNames[methodName] || `RPC: ${methodName}`;
                    
                    // 简化参数显示
                    let displayParams = null;
                    const params = args[1] || (args[0] && args[0].params);
                    if (params && Array.isArray(params) && params.length > 0) {
                        displayParams = params.map(p => {
                            if (typeof p === 'string' && p.startsWith('0x')) {
                                if (p.length === 42) {
                                    return Utils.formatAddress(p, 6);
                                } else if (p.length === 66) {
                                    return Utils.formatHash(p, 8);
                                }
                            }
                            return p;
                        });
                    }
                    
                    ConsoleModule.log('rpc', displayName, displayParams);
                }
                
                // 重要：调用原始方法并返回结果
                try {
                    const result = await originalMethod.apply(this, args);
                    return result;
                } catch (error) {
                    if (methodName) {
                        ConsoleModule.log('error', `RPC 错误: ${methodName}`, error.message);
                    }
                    throw error;
                }
            };
        };
        
        // 替换方法 - 使用正确的拦截方式
        if (originalSend) {
            provider.send = intercept(originalSend);
        }
        if (originalCall) {
            provider._call = intercept(originalCall);
        }
        if (originalPerform) {
            provider._perform = intercept(originalPerform);
        }
    }
};

// 全局控制台命令
window.clearConsole = function() {
    ConsoleModule.clear();
};

window.exportLogs = function() {
    ConsoleModule.export();
};