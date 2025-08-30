// 合约管理模块
const ContractsModule = {
    contracts: [],

    // 初始化
    init: async function () {
        console.log('Initializing contracts module... - contracts.js:7');
        this.loadContracts();
        await this.detectDeployedContracts();
        this.render();
    },

    // 从本地存储加载合约
    loadContracts: function () {
        this.contracts = Storage.getContracts();
        console.log(`Loaded ${this.contracts.length} contracts from storage - contracts.js:16`);
    },

    // 检测已部署的合约（通过分析交易）
    // 检测已部署的合约（改进版）
    detectDeployedContracts: async function () {
        try {
            const currentBlockNumber = await provider.getBlockNumber();
            console.log(`Scanning blocks 1 to ${currentBlockNumber} for contracts...`);

            const detectedContracts = [];

            // 从第1块开始扫描（0是创世块）
            for (let i = 1; i <= currentBlockNumber; i++) {
                const block = await provider.getBlock(i, false);  // false = 只获取交易哈希
                console.log(`Checking block ${i}, transactions:`, block?.transactions?.length || 0);

                if (block && block.transactions && block.transactions.length > 0) {
                    for (const txHash of block.transactions) {
                        // 获取完整的交易对象
                        const tx = await provider.getTransaction(txHash);
                        console.log(`Block ${i} tx hash:`, txHash, 'to:', tx?.to, 'from:', tx?.from);
                        
                        // 合约创建交易的 to 地址为 null
                        if (tx && tx.to === null && tx.from) {
                            console.log(`Found contract creation tx in block ${i}, hash:`, tx.hash);

                            const receipt = await provider.getTransactionReceipt(tx.hash);

                            if (receipt && receipt.contractAddress) {
                                // 检查是否已经记录
                                const exists = this.contracts.some(c =>
                                    c.address.toLowerCase() === receipt.contractAddress.toLowerCase()
                                );

                                if (!exists) {
                                    const contract = {
                                        address: receipt.contractAddress,
                                        deployTx: tx.hash,
                                        deployer: tx.from,
                                        blockNumber: receipt.blockNumber,
                                        timestamp: block.timestamp,
                                        name: 'Contract ' + receipt.contractAddress.substring(0, 8),
                                        abi: []
                                    };

                                    detectedContracts.push(contract);
                                    console.log('Detected new contract: - contracts.js:58', contract.address);
                                }
                            }
                        }
                    }
                }
            }

            if (detectedContracts.length > 0) {
                console.log(`Found ${detectedContracts.length} new contracts - contracts.js:67`);

                // 添加到合约列表
                detectedContracts.forEach(contract => {
                    this.contracts.push(contract);
                });

                // 保存到存储
                Storage.set('contracts', this.contracts);

                // 重新渲染
                this.render();
            } else {
                console.log('No new contracts found - contracts.js:80');
            }

        } catch (error) {
            console.error('Failed to detect contracts: - contracts.js:84', error);
        }
    },

    // 渲染合约列表
    render: function () {
        const container = document.getElementById('contractsList');
        if (!container) return;

        if (this.contracts.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-8 text-center">
                    <i class="fas fa-file-code text-4xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400 mb-4">暂无已部署的合约</p>
                    <div class="space-x-2">
                        <button 
                            onclick="ContractsModule.showAddContractForm()"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                            <i class="fas fa-plus mr-2"></i>添加合约
                        </button>
                        <button 
                            onclick="ContractsModule.deploySimpleContract()"
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors">
                            <i class="fas fa-rocket mr-2"></i>部署示例合约
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const html = `
            <div class="mb-4 flex justify-between items-center">
        <div class="text-gray-400">
            共 ${this.contracts.length} 个合约
        </div>
        <div class="space-x-2">
            <button 
                onclick="ContractsModule.detectDeployedContracts()"
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors">
                <i class="fas fa-search mr-2"></i>扫描合约
            </button>
            <button 
                onclick="ContractsModule.showAddContractForm()"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                <i class="fas fa-plus mr-2"></i>添加合约
            </button>
        </div>
    </div>
            
            <div class="grid gap-4">
                ${this.contracts.map((contract, index) => `
                    <div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 mb-2">
                                    <h3 class="text-lg font-semibold">${contract.name}</h3>
                                    ${contract.verified ?
                '<span class="bg-green-600 text-white text-xs px-2 py-1 rounded">已验证</span>' :
                ''
            }
                                </div>
                                
                                <div class="space-y-2 text-sm">
                                    <div class="flex items-center space-x-2">
                                        <span class="text-gray-400">地址:</span>
                                        <code class="text-white">${Utils.formatAddress(contract.address, 8)}</code>
                                        <button onclick="Utils.copyToClipboard('${contract.address}', this)" class="text-gray-400 hover:text-white">
                                            <i class="fas fa-copy text-xs"></i>
                                        </button>
                                    </div>
                                    
                                    <div class="flex items-center space-x-2">
                                        <span class="text-gray-400">部署者:</span>
                                        <code class="text-white">${Utils.formatAddress(contract.deployer)}</code>
                                    </div>
                                    
                                    <div class="flex items-center space-x-2">
                                        <span class="text-gray-400">区块:</span>
                                        <span class="text-blue-400">#${contract.blockNumber}</span>
                                    </div>
                                    
                                    ${contract.deployTx ? `
                                        <div class="flex items-center space-x-2">
                                            <span class="text-gray-400">部署交易:</span>
                                            <code class="text-blue-400 text-xs">${Utils.formatHash(contract.deployTx, 8)}</code>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="flex flex-col space-y-2">
                                <button 
                                    onclick="ContractsModule.interactWithContract(${index})"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                    <i class="fas fa-play mr-1"></i>交互
                                </button>
                                <button 
                                    onclick="ContractsModule.viewContractDetails(${index})"
                                    class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                                    <i class="fas fa-info mr-1"></i>详情
                                </button>
                                <button 
                                    onclick="ContractsModule.removeContract(${index})"
                                    class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                    <i class="fas fa-trash mr-1"></i>删除
                                </button>
                            </div>
                        </div>
                        
                        ${contract.abi && contract.abi.length > 0 ? `
                            <div class="mt-4 pt-4 border-t border-gray-700">
                                <div class="text-sm text-gray-400 mb-2">ABI 函数:</div>
                                <div class="flex flex-wrap gap-2">
                                    ${contract.abi
                    .filter(item => item.type === 'function')
                    .slice(0, 5)
                    .map(func => `
                                            <span class="bg-gray-700 px-2 py-1 rounded text-xs">
                                                ${func.name}
                                            </span>
                                        `).join('')}
                                    ${contract.abi.filter(item => item.type === 'function').length > 5 ?
                    `<span class="text-gray-500 text-xs">+${contract.abi.filter(item => item.type === 'function').length - 5} 更多</span>` :
                    ''
                }
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <!-- 添加合约模态框 -->
            <div id="addContractModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                    <h3 class="text-xl font-bold mb-4">添加合约</h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">合约名称</label>
                            <input id="contractName" type="text" class="w-full bg-gray-700 rounded px-3 py-2 text-white" placeholder="My Contract">
                        </div>
                        
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">合约地址</label>
                            <input id="contractAddress" type="text" class="w-full bg-gray-700 rounded px-3 py-2 text-white font-mono" placeholder="0x...">
                        </div>
                        
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">ABI (JSON)</label>
                            <textarea id="contractABI" class="w-full bg-gray-700 rounded px-3 py-2 text-white font-mono h-32" placeholder="[]"></textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-2 mt-4">
                        <button 
                            onclick="ContractsModule.hideAddContractForm()"
                            class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors">
                            取消
                        </button>
                        <button 
                            onclick="ContractsModule.addContractFromForm()"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                            添加
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // 添加合约
    addContract: function (contract) {
        const contractData = {
            ...contract,
            id: Utils.generateId(),
            timestamp: contract.timestamp || Date.now()
        };

        this.contracts.push(contractData);
        Storage.set('contracts', this.contracts);
        this.render();

        return contractData;
    },

    // 显示添加合约表单
    showAddContractForm: function () {
        const modal = document.getElementById('addContractModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    // 隐藏添加合约表单
    hideAddContractForm: function () {
        const modal = document.getElementById('addContractModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // 从表单添加合约
    addContractFromForm: function () {
        const name = document.getElementById('contractName').value;
        const address = document.getElementById('contractAddress').value;
        const abiText = document.getElementById('contractABI').value;

        if (!name || !address) {
            showToast('请填写合约名称和地址', 'error');
            return;
        }

        let abi = [];
        if (abiText) {
            try {
                abi = JSON.parse(abiText);
            } catch (error) {
                showToast('ABI 格式错误', 'error');
                return;
            }
        }

        this.addContract({
            name: name,
            address: address,
            abi: abi,
            deployer: signer ? signer.address : 'Unknown',
            blockNumber: currentBlockNumber || 0,
            verified: false
        });

        this.hideAddContractForm();
        showToast('合约添加成功', 'success');
    },

    // 部署示例合约
    deploySimpleContract: async function () {
        try {
            if (!signer) {
                showToast('没有可用的签名账户', 'error');
                return;
            }

            showToast('正在部署示例合约...', 'info');

            // SimpleStorage 合约字节码
            const bytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100d9565b60405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b60008135905061009781610103565b92915050565b6000602082840312156100b3576100b26100fe565b5b60006100c184828501610088565b91505092915050565b6100d3816100f4565b82525050565b60006020820190506100ee60008301846100ca565b92915050565b6000819050919050565b600080fd5b61010c816100f4565b811461011757600080fd5b5056fea26469706673582212209a159a4f3847890f10bfb87871a61eba91c5dbf5ee3cf6398207e292eee22a1664736f6c63430008070033";

            const abi = [
                {
                    "inputs": [],
                    "name": "retrieve",
                    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],
                    "name": "store",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ];

            const factory = new ethers.ContractFactory(abi, bytecode, signer);
            const contract = await factory.deploy();

            showToast(`合约部署中: ${contract.target}`, 'info');

            await contract.waitForDeployment();
            const address = await contract.getAddress();

            // 添加到合约列表
            this.addContract({
                name: 'SimpleStorage',
                address: address,
                abi: abi,
                deployer: await signer.getAddress(),
                blockNumber: await provider.getBlockNumber(),
                deployTx: contract.deploymentTransaction().hash,
                verified: true
            });

            showToast(`合约部署成功: ${address}`, 'success');

        } catch (error) {
            console.error('Deploy failed: - contracts.js:375', error);
            showToast('部署失败: ' + error.message, 'error');
        }
    },

    // 与合约交互
    interactWithContract: function (index) {
        const contract = this.contracts[index];
        if (!contract.abi || contract.abi.length === 0) {
            showToast('该合约没有 ABI，无法交互', 'error');
            return;
        }

        // TODO: 实现合约交互界面
        showToast('合约交互功能开发中...', 'info');
        console.log('Contract for interaction: - contracts.js:390', contract);
    },

    // 查看合约详情
    viewContractDetails: function (index) {
        const contract = this.contracts[index];
        // TODO: 实现详情模态框
        console.log('Contract details: - contracts.js:397', contract);
        showToast('详情功能开发中...', 'info');
    },

    // 删除合约
    removeContract: function (index) {
        if (confirm('确定要删除这个合约吗？')) {
            this.contracts.splice(index, 1);
            Storage.set('contracts', this.contracts);
            this.render();
            showToast('合约已删除', 'success');
        }
    },

    // 刷新
    refresh: function () {
        this.render();
    }
};