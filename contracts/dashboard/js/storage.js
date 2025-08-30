// 本地存储管理
const Storage = {
    prefix: 'hardhat_dashboard_',
    
    // 获取存储项
    get: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (err) {
            console.error('Storage get error: - storage.js:11', err);
            return defaultValue;
        }
    },
    
    // 设置存储项
    set: function(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('Storage set error: - storage.js:22', err);
            return false;
        }
    },
    
    // 删除存储项
    remove: function(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (err) {
            console.error('Storage remove error: - storage.js:33', err);
            return false;
        }
    },
    
    // 清空所有存储
    clear: function() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (err) {
            console.error('Storage clear error: - storage.js:49', err);
            return false;
        }
    },
    
    // 获取所有存储的合约
    getContracts: function() {
        return this.get('contracts', []);
    },
    
    // 添加合约
    addContract: function(contract) {
        const contracts = this.getContracts();
        contracts.push({
            ...contract,
            id: Utils.generateId(),
            timestamp: Date.now()
        });
        return this.set('contracts', contracts);
    },
    
    // 删除合约
    removeContract: function(id) {
        const contracts = this.getContracts();
        const filtered = contracts.filter(c => c.id !== id);
        return this.set('contracts', filtered);
    },
    
    // 获取设置
    getSettings: function() {
        return this.get('settings', {
            rpcUrl: 'http://localhost:8545',
            autoRefresh: true,
            refreshInterval: 5000,
            showPrivateKeys: false,
            theme: 'dark'
        });
    },
    
    // 保存设置
    saveSettings: function(settings) {
        return this.set('settings', settings);
    }
};