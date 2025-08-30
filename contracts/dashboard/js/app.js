// 全局变量
let provider = null;
let signer = null;
let isConnected = false;
let currentBlockNumber = 0;

// 初始化应用
async function initApp() {
    console.log('🚀 Initializing Hardhat Dashboard... - app.js:9');
    
    try {
        // 连接到 Hardhat 节点
        await connectToProvider();
        
        // 初始化控制台（需要先连接 provider）
        ConsoleModule.init();
        
        // 初始化各个模块
        await AccountsModule.init();
        await BlocksModule.init();
        await TransactionsModule.init();
        await ContractsModule.init();
        await EventsModule.init();
        
        // 开始监听
        startListeners();
        
        // 显示成功通知
        showToast('成功连接到 Hardhat 节点', 'success');
        ConsoleModule.log('success', '✅ 所有模块初始化完成');
        
    } catch (error) {
        console.error('Failed to initialize: - app.js:33', error);
        showToast('连接失败，请确保 Hardhat 节点正在运行', 'error');
        
        // 如果 ConsoleModule 已初始化，记录错误
        if (window.ConsoleModule && ConsoleModule.log) {
            ConsoleModule.log('error', '❌ 初始化失败', error.message);
        }
        
        // 5秒后重试
        setTimeout(initApp, 5000);
    }
}

// 连接到 Provider
async function connectToProvider() {
    const RPC_URL = Storage.getSettings().rpcUrl || 'http://localhost:8545';
    
    console.log('尝试连接到: - app.js:50', RPC_URL);
    
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('连接超时')), 5000)
    );
    
    try {
        // 测试连接
        const networkPromise = provider.getNetwork();
        const network = await Promise.race([networkPromise, timeoutPromise]);
        const blockNumber = await provider.getBlockNumber();
        
        console.log('连接成功！ - app.js:65', { chainId: network.chainId.toString(), blockNumber });
        
        // 获取 signer
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            signer = await provider.getSigner(0);
        }
        
        // 更新 UI
        document.getElementById('chainId').textContent = network.chainId.toString();
        document.getElementById('blockNumber').textContent = blockNumber;
        
        // 更新连接状态
        updateConnectionStatus(true);
        isConnected = true;
        currentBlockNumber = blockNumber;
        
        // 更新 Gas Price
        await updateGasPrice();
        
    } catch (error) {
        console.error('连接失败: - app.js:86', error);
        
        // 尝试备用地址
        if (RPC_URL.includes('localhost')) {
            console.log('尝试备用地址 127.0.0.1... - app.js:90');
            const altUrl = RPC_URL.replace('localhost', '127.0.0.1');
            
            try {
                provider = new ethers.JsonRpcProvider(altUrl);
                await provider.getNetwork();
                console.log('使用备用地址连接成功！ - app.js:96');
                Storage.saveSettings({ ...Storage.getSettings(), rpcUrl: altUrl });
                return await connectToProvider(); // 递归调用
            } catch (e) {
                throw error; // 还是失败，抛出原始错误
            }
        }
        throw error;
    }
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (connected) {
        indicator.classList.remove('bg-red-500');
        indicator.classList.add('bg-green-500');
        text.textContent = '已连接';
        text.classList.remove('text-gray-400');
        text.classList.add('text-green-400');
    } else {
        indicator.classList.remove('bg-green-500');
        indicator.classList.add('bg-red-500');
        text.textContent = '未连接';
        text.classList.remove('text-green-400');
        text.classList.add('text-gray-400');
    }
}

// 更新 Gas Price
async function updateGasPrice() {
    try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0';
        document.getElementById('gasPrice').textContent = parseFloat(gasPrice).toFixed(2);
    } catch (error) {
        console.error('Failed to update gas price: - app.js:134', error);
        document.getElementById('gasPrice').textContent = '-';
    }
}

// 开始监听事件
function startListeners() {
    if (!provider) return;
    
    // 监听新区块
    provider.on('block', async (blockNumber) => {
        console.log(`New block: ${blockNumber} - app.js:145`);
        currentBlockNumber = blockNumber;
        
        // 更新区块号显示
        document.getElementById('blockNumber').textContent = blockNumber;
        
        // 更新各模块
        await BlocksModule.onNewBlock(blockNumber);
        await AccountsModule.updateBalances();
        await updateGasPrice();
    });
    
    // 错误处理
    provider.on('error', (error) => {
        console.error('Provider error: - app.js:159', error);
        ConsoleModule.log('error', '⚠️ 连接错误', error.message);
    });
}

// 切换标签页
window.switchTab = function(tabName) {
    // 隐藏所有面板
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    // 显示选中的面板
    const panel = document.getElementById(`${tabName}-panel`);
    if (panel) {
        panel.classList.remove('hidden');
    }
    
    // 触发相应模块的刷新
    switch(tabName) {
        case 'accounts':
            AccountsModule.refresh();
            break;
        case 'blocks':
            BlocksModule.refresh();
            break;
        case 'transactions':
            TransactionsModule.refresh();
            break;
        case 'contracts':
            ContractsModule.refresh();
            break;
        case 'events':
            EventsModule.refresh();
            break;
        case 'console':
            // 控制台不需要刷新
            break;
    }
};

// 显示 Toast 通知
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse-custom`;
    
    // 根据类型设置颜色和图标
    const configs = {
        'success': { bg: 'bg-green-600', icon: 'fa-check-circle' },
        'error': { bg: 'bg-red-600', icon: 'fa-times-circle' },
        'warning': { bg: 'bg-yellow-600', icon: 'fa-exclamation-triangle' },
        'info': { bg: 'bg-blue-600', icon: 'fa-info-circle' }
    };
    
    const config = configs[type] || configs.info;
    toast.classList.add(config.bg);
    toast.innerHTML = `<i class="fas ${config.icon}"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// 打开设置（预留）
window.openSettings = function() {
    showToast('设置功能开发中...', 'info');
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (provider) {
        provider.removeAllListeners();
    }
});