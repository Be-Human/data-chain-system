// 工具函数模块
const Utils = {
    // 格式化地址（缩短）
    formatAddress: function(address, length = 4) {
        if (!address) return '';
        return `${address.substring(0, length + 2)}...${address.substring(address.length - length)}`;
    },
    
    // 格式化哈希
    formatHash: function(hash, length = 6) {
        if (!hash) return '';
        return `${hash.substring(0, length + 2)}...${hash.substring(hash.length - length)}`;
    },
    
    // 复制到剪贴板
    copyToClipboard: async function(text, buttonElement = null) {
        try {
            await navigator.clipboard.writeText(text);
            
            if (buttonElement) {
                // 保存原始内容
                const originalHTML = buttonElement.innerHTML;
                
                // 显示已复制
                buttonElement.innerHTML = '<i class="fas fa-check text-green-400"></i>';
                buttonElement.classList.add('copied');
                
                // 2秒后恢复
                setTimeout(() => {
                    buttonElement.innerHTML = originalHTML;
                    buttonElement.classList.remove('copied');
                }, 2000);
            }
            
            showToast('已复制到剪贴板', 'success');
            return true;
        } catch (err) {
            console.error('Failed to copy: - utils.js:38', err);
            showToast('复制失败', 'error');
            return false;
        }
    },
    
    // 格式化时间戳
    formatTimestamp: function(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('zh-CN');
    },
    
    // 格式化 Wei 到 ETH
    formatEther: function(wei) {
        try {
            const eth = ethers.formatEther(wei);
            // 保留4位小数，去掉末尾的0
            return parseFloat(eth).toFixed(4).replace(/\.?0+$/, '');
        } catch (err) {
            return '0';
        }
    },
    
    // 格式化 Gas
    formatGas: function(gas) {
        if (!gas) return '0';
        return gas.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    // 生成唯一ID
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // 防抖函数
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};