// 账户管理模块
const AccountsModule = {
    accounts: [],
    accountCount: 20,
    
    // 初始化
    init: async function() {
        console.log('Initializing accounts module... - accounts.js:8');
        
        // 先显示加载状态
        this.showLoading();
        
        try {
            await this.loadAccounts();
            this.render();
            console.log('Accounts module initialized successfully - accounts.js:16');
        } catch (error) {
            console.error('Failed to initialize accounts: - accounts.js:18', error);
            this.showError(error.message);
        }
    },
    
    // 显示加载状态
    showLoading: function() {
        const container = document.getElementById('accountsList');
        if (!container) {
            console.error('accountsList container not found! - accounts.js:27');
            return;
        }
        
        container.innerHTML = `
            <div class="grid gap-4">
                ${[...Array(3)].map(() => `
                    <div class="bg-gray-800 rounded-lg p-6 animate-pulse">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center space-x-3">
                                <div class="w-12 h-12 bg-gray-700 rounded-full"></div>
                                <div>
                                    <div class="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                                    <div class="h-3 bg-gray-700 rounded w-48"></div>
                                </div>
                            </div>
                            <div>
                                <div class="h-6 bg-gray-700 rounded w-32 mb-2"></div>
                                <div class="h-3 bg-gray-700 rounded w-20"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    // 显示错误
    showError: function(message) {
        const container = document.getElementById('accountsList');
        if (!container) return;
        
        container.innerHTML = `
            <div class="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p class="text-red-400 mb-2">加载账户失败</p>
                <p class="text-gray-400 text-sm mb-4">${message}</p>
                <button 
                    onclick="AccountsModule.retry()"
                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors">
                    <i class="fas fa-redo mr-2"></i>重试
                </button>
            </div>
        `;
    },
    
    // 重试
    retry: async function() {
        await this.init();
    },
    
    // 使用 HD 钱包生成账户
    generateAccountData: function() {
        const mnemonic = "test test test test test test test test test test test junk";
        
        // ethers v6 的正确用法
        const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
        
        const accountData = [];
        for (let i = 0; i < this.accountCount; i++) {
            const path = `m/44'/60'/0'/0/${i}`;
            const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, path);
            
            accountData.push({
                index: i,
                address: wallet.address,
                privateKey: wallet.privateKey
            });
        }
        return accountData;
    },
    
    // 加载账户
    loadAccounts: async function() {
        if (!provider) {
            throw new Error('Provider not initialized');
        }
        
        try {
            // 使用正确的生成方法
            const accountData = this.generateAccountData();
            this.accounts = [];
            
            console.log('Loading balances for - accounts.js:110', accountData.length, 'accounts...');
            
            // 批量加载
            const promises = accountData.map(async (data) => {
                try {
                    const [balance, txCount] = await Promise.all([
                        provider.getBalance(data.address),
                        provider.getTransactionCount(data.address)
                    ]);
                    
                    return {
                        index: data.index,
                        address: data.address,
                        privateKey: data.privateKey,
                        balance: balance.toString(),
                        txCount: txCount,
                        nickname: Storage.get(`nickname_${data.address}`) || `Account ${data.index}`
                    };
                } catch (error) {
                    console.error(`Failed to load account ${data.index}: - accounts.js:129`, error);
                    return {
                        index: data.index,
                        address: data.address,
                        privateKey: data.privateKey,
                        balance: '0',
                        txCount: 0,
                        nickname: `Account ${data.index}`,
                        error: true
                    };
                }
            });
            
            this.accounts = await Promise.all(promises);
            
            console.log('Loaded accounts: - accounts.js:144', this.accounts.length);
            
            // 检查是否有账户加载失败
            const failedAccounts = this.accounts.filter(a => a.error);
            if (failedAccounts.length > 0) {
                console.warn(`${failedAccounts.length} accounts failed to load completely - accounts.js:149`);
            }
            
        } catch (error) {
            console.error('Failed to load accounts: - accounts.js:153', error);
            throw error;
        }
    },
    
    // 渲染账户列表
    render: function() {
        const container = document.getElementById('accountsList');
        if (!container) {
            console.error('accountsList container not found! - accounts.js:162');
            return;
        }
        
        if (this.accounts.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-8 text-center">
                    <i class="fas fa-wallet text-4xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400">没有找到账户</p>
                </div>
            `;
            return;
        }
        const accountsCount = document.getElementById('accountsCount');
        if (accountsCount) {
            accountsCount.textContent = this.accounts.length;
        }
        const showPrivateKeys = Storage.getSettings().showPrivateKeys;
        
        const html = this.accounts.map(account => {
            const isError = account.error;
            
            return `
                <div class="bg-gray-800 rounded-lg p-6 account-card hover:bg-gray-750 transition-all ${isError ? 'opacity-75' : ''}">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                ${account.index}
                            </div>
                            <div>
                                <div class="flex items-center space-x-2">
                                    <h3 class="font-semibold text-lg">${account.nickname}</h3>
                                    <button 
                                        onclick="AccountsModule.editNickname(${account.index})"
                                        class="text-gray-400 hover:text-white">
                                        <i class="fas fa-edit text-xs"></i>
                                    </button>
                                </div>
                                <div class="flex items-center space-x-2 mt-1">
                                    <code class="text-sm text-gray-400">${Utils.formatAddress(account.address, 8)}</code>
                                    <button 
                                        onclick="Utils.copyToClipboard('${account.address}', this)"
                                        class="copy-btn text-gray-400 hover:text-white transition-colors">
                                        <i class="fas fa-copy text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="text-right">
                            <div class="text-2xl font-bold text-white">
                                ${isError ? '-' : Utils.formatEther(account.balance)} ETH
                            </div>
                            <div class="text-sm text-gray-400">
                                ${account.txCount} 笔交易
                            </div>
                            ${isError ? '<div class="text-xs text-red-400 mt-1">加载失败</div>' : ''}
                        </div>
                    </div>
                    
                    <!-- 私钥部分 -->
                    <div class="border-t border-gray-700 pt-4">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-400">私钥</span>
                            <button 
                                onclick="AccountsModule.togglePrivateKey(${account.index})"
                                class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                <i class="fas fa-${showPrivateKeys ? 'eye-slash' : 'eye'} mr-1"></i>
                                ${showPrivateKeys ? '隐藏' : '显示'}
                            </button>
                        </div>
                        
                        <div id="privateKey_${account.index}" class="${showPrivateKeys ? '' : 'hidden'} mt-2">
                            <div class="flex items-center space-x-2 bg-gray-900 rounded p-2">
                                <code class="text-xs text-gray-400 flex-1 break-all">
                                    ${account.privateKey}
                                </code>
                                <button 
                                    onclick="Utils.copyToClipboard('${account.privateKey}', this)"
                                    class="copy-btn text-gray-400 hover:text-white">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 快速操作 -->
                    <div class="flex space-x-2 mt-4">
                        <button 
                            onclick="AccountsModule.sendTransaction(${account.index})"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors ${isError ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${isError ? 'disabled' : ''}>
                            <i class="fas fa-paper-plane mr-2"></i>发送
                        </button>
                        <button 
                            onclick="AccountsModule.viewDetails(${account.index})"
                            class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
                            <i class="fas fa-info-circle mr-2"></i>详情
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="grid gap-4">${html}</div>`;
        
        console.log('Accounts rendered successfully - accounts.js:268');
    },
    
    // 切换私钥显示
    togglePrivateKey: function(index) {
        const element = document.getElementById(`privateKey_${index}`);
        if (element) {
            element.classList.toggle('hidden');
        }
    },
    
    // 更新余额
    updateBalances: async function() {
        if (!provider || this.accounts.length === 0) return;
        
        try {
            for (let account of this.accounts) {
                const balance = await provider.getBalance(account.address);
                const txCount = await provider.getTransactionCount(account.address);
                account.balance = balance.toString();
                account.txCount = txCount;
                account.error = false;
            }
            this.render();
        } catch (error) {
            console.error('Failed to update balances: - accounts.js:293', error);
        }
    },
    
    // 刷新
    refresh: function() {
        if (this.accounts.length > 0) {
            this.updateBalances();
        } else {
            this.init();
        }
    },
    
    // 其他方法保持不变...
    editNickname: function(index) {
        const account = this.accounts[index];
        const newName = prompt('设置账户昵称:', account.nickname);
        if (newName) {
            account.nickname = newName;
            Storage.set(`nickname_${account.address}`, newName);
            this.render();
        }
    },
    
    sendTransaction: async function(index) {
        showToast('发送交易功能开发中...', 'info');
    },
    
    viewDetails: function(index) {
        const account = this.accounts[index];
        console.log('Account details: - accounts.js:323', account);
        showToast('详情功能开发中...', 'info');
    }
};