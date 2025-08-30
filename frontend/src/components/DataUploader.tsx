import { useState } from 'react';
import { 
  useAccount, 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useChainId,
  useSendTransaction,
  useWalletClient 
} from 'wagmi';
import { parseEther, toHex, stringToHex } from 'viem';
import { DataLoggerABI, getContractAddress } from '../config/contracts';

type TabType = 'log' | 'contract-payment' | 'native-transfer';

export function DataUploader() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const { data: walletClient } = useWalletClient();
  
  const [activeTab, setActiveTab] = useState<TabType>('log');
  
  // 表单状态
  const [category, setCategory] = useState('');
  const [data, setData] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [nativeData, setNativeData] = useState('');
  const [dataFormat, setDataFormat] = useState<'text' | 'hex'>('text');

  // 合约写入 hooks - 日志方式
  const { 
    writeContract: writeLogData, 
    data: logDataHash,
    isPending: isLogging,
    error: logError,
    reset: resetLog
  } = useWriteContract();

  // 合约写入 hooks - 合约转账
  const { 
    writeContract: writePayment,
    data: paymentHash,
    isPending: isPaying,
    error: payError,
    reset: resetPayment
  } = useWriteContract();

  // 原生转账 hook
  const {
    sendTransaction,
    data: nativeHash,
    isPending: isSending,
    error: sendError,
    reset: resetSend
  } = useSendTransaction();

  // 等待交易确认
  const { isLoading: isLogConfirming, isSuccess: isLogSuccess } = 
    useWaitForTransactionReceipt({ hash: logDataHash });
  
  const { isLoading: isPayConfirming, isSuccess: isPaySuccess } = 
    useWaitForTransactionReceipt({ hash: paymentHash });
    
  const { isLoading: isNativeConfirming, isSuccess: isNativeSuccess } = 
    useWaitForTransactionReceipt({ hash: nativeHash });

  // 处理日志上传
  const handleLogData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !data || !contractAddress) return;

    writeLogData({
      address: contractAddress,
      abi: DataLoggerABI,
      functionName: 'logData',
      args: [category, data],
    });
  };

  // 处理合约转账
  const handleContractPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !memo || !contractAddress) return;
    
    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      alert('请输入有效的以太坊地址');
      return;
    }
    
    // 验证金额
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('请输入有效的金额');
      return;
    }

    writePayment({
      address: contractAddress,
      abi: DataLoggerABI,
      functionName: 'logWithPayment',
      args: [recipient as `0x${string}`, memo],
      value: parseEther(amount),
    });
  };

  // 处理原生转账
  const handleNativeTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;
    
    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      alert('请输入有效的以太坊地址');
      return;
    }
    
    // 验证金额
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('请输入有效的金额');
      return;
    }

    // 准备 data 字段
    let txData: `0x${string}` | undefined;
    if (nativeData) {
      if (dataFormat === 'hex') {
        // 如果是 hex 格式，验证并使用
        if (nativeData.startsWith('0x')) {
          txData = nativeData as `0x${string}`;
        } else {
          txData = `0x${nativeData}` as `0x${string}`;
        }
      } else {
        // 如果是文本，转换为 hex
        txData = stringToHex(nativeData);
      }
    }

    // 发送原生转账
    sendTransaction({
      to: recipient as `0x${string}`,
      value: parseEther(amount),
      data: txData,
    });
  };

  // 重置表单
  const resetForm = () => {
    setCategory('');
    setData('');
    setRecipient('');
    setAmount('');
    setMemo('');
    setNativeData('');
    resetLog();
    resetPayment();
    resetSend();
  };

  // 成功后重置
  if (isLogSuccess || isPaySuccess || isNativeSuccess) {
    setTimeout(resetForm, 2000);
  }

  if (!isConnected) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">数据上链</h2>
        <p className="text-gray-500 text-center py-8">
          请先连接钱包
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">数据上链</h2>
      
      {/* Tab 切换 - 三个选项 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 py-2 px-3 rounded-md transition-all text-sm ${
            activeTab === 'log' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 日志方式
        </button>
        <button
          onClick={() => setActiveTab('contract-payment')}
          className={`flex-1 py-2 px-3 rounded-md transition-all text-sm ${
            activeTab === 'contract-payment' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔒 合约转账
        </button>
        <button
          onClick={() => setActiveTab('native-transfer')}
          className={`flex-1 py-2 px-3 rounded-md transition-all text-sm ${
            activeTab === 'native-transfer' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚡ 原生转账
        </button>
      </div>

      {/* 功能说明 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs">
        {activeTab === 'log' && (
          <div>
            <strong className="text-blue-900">📝 日志方式：</strong>
            <span className="text-blue-700"> 数据存储在合约中，Gas 费中等，可查询性最好</span>
          </div>
        )}
        {activeTab === 'contract-payment' && (
          <div>
            <strong className="text-blue-900">🔒 合约转账：</strong>
            <span className="text-blue-700"> 通过合约转账并记录，Gas 费较高，数据永久存储</span>
          </div>
        )}
        {activeTab === 'native-transfer' && (
          <div>
            <strong className="text-blue-900">⚡ 原生转账：</strong>
            <span className="text-blue-700"> 直接转账，Gas 费最低（21000），数据在交易 input 中</span>
          </div>
        )}
      </div>

      {/* 日志方式表单 */}
      {activeTab === 'log' && contractAddress && (
        <form onSubmit={handleLogData} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数据分类
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例如: personal, business, test"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数据内容
            </label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="输入要上链的数据..."
              className="input-field min-h-[100px] resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLogging || isLogConfirming}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLogging ? '准备中...' : 
             isLogConfirming ? '确认中...' : 
             isLogSuccess ? '✅ 上链成功！' : 
             '上传到区块链'}
          </button>

          {logError && (
            <div className="text-red-500 text-sm mt-2">
              错误: {logError.message.split('\n')[0]}
            </div>
          )}
        </form>
      )}

      {/* 合约转账表单 */}
      {activeTab === 'contract-payment' && contractAddress && (
        <form onSubmit={handleContractPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              接收地址
              <button
                type="button"
                onClick={() => setRecipient('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
                className="ml-2 text-xs text-blue-600 hover:text-blue-700"
              >
                使用测试地址
              </button>
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="input-field font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              转账金额 (ETH)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setAmount(value);
                }
              }}
              placeholder="0.001"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注信息（存储在合约中）
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="这些数据会永久存储在合约中..."
              className="input-field min-h-[80px] resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isPaying || isPayConfirming}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPaying ? '准备中...' : 
             isPayConfirming ? '确认中...' : 
             isPaySuccess ? '✅ 转账成功！' : 
             '通过合约转账'}
          </button>

          {payError && (
            <div className="text-red-500 text-sm mt-2">
              错误: {payError.message.split('\n')[0]}
            </div>
          )}
        </form>
      )}

      {/* 原生转账表单 */}
      {activeTab === 'native-transfer' && (
        <form onSubmit={handleNativeTransfer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              接收地址
              <button
                type="button"
                onClick={() => setRecipient('0x0000000000000000000000000000000000000000')}
                className="ml-2 text-xs text-blue-600 hover:text-blue-700"
              >
                使用测试地址
              </button>
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="input-field font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              转账金额 (ETH)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setAmount(value);
                }
              }}
              placeholder="0.001"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              附加数据（可选，在交易 input 中）
              <select
                value={dataFormat}
                onChange={(e) => setDataFormat(e.target.value as 'text' | 'hex')}
                className="ml-2 text-xs border rounded px-2 py-1"
              >
                <option value="text">文本</option>
                <option value="hex">Hex</option>
              </select>
            </label>
            <textarea
              value={nativeData}
              onChange={(e) => setNativeData(e.target.value)}
              placeholder={dataFormat === 'text' 
                ? "输入文本数据（将自动转换为 hex）..." 
                : "输入 hex 数据（0x 开头）..."}
              className="input-field min-h-[60px] resize-none font-mono text-xs"
            />
            {nativeData && (
              <p className="text-xs text-gray-500 mt-1">
                {dataFormat === 'text' 
                  ? `将转换为 Hex: ${stringToHex(nativeData)}`
                  : 'Hex 数据将直接使用'}
              </p>
            )}
          </div>

          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>⚠️ 注意：</strong>原生转账的数据不会存储在合约中，只在交易记录里。
              需要通过 Etherscan 或其他工具查看交易的 input data。
            </p>
          </div>

          <button
            type="submit"
            disabled={isSending || isNativeConfirming}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? '准备中...' : 
             isNativeConfirming ? '确认中...' : 
             isNativeSuccess ? '✅ 转账成功！' : 
             '直接转账'}
          </button>

          {sendError && (
            <div className="text-red-500 text-sm mt-2">
              错误: {sendError.message.split('\n')[0]}
            </div>
          )}
        </form>
      )}

      {/* 不同方式的对比 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
            💡 三种方式对比
          </summary>
          <div className="mt-3 space-y-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="pb-2">方式</th>
                  <th className="pb-2">Gas 费</th>
                  <th className="pb-2">数据存储</th>
                  <th className="pb-2">查询</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="py-1">📝 日志</td>
                  <td>~50k</td>
                  <td>合约存储</td>
                  <td>⭐⭐⭐⭐⭐</td>
                </tr>
                <tr>
                  <td className="py-1">🔒 合约转账</td>
                  <td>~80k</td>
                  <td>合约存储</td>
                  <td>⭐⭐⭐⭐⭐</td>
                </tr>
                <tr>
                  <td className="py-1">⚡ 原生转账</td>
                  <td>21k</td>
                  <td>交易 input</td>
                  <td>⭐⭐</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* 当前账户信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          当前账户: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
        {nativeHash && (
          <p className="text-xs text-green-600 mt-1">
            交易哈希: {nativeHash.slice(0, 10)}...
            <a 
              href={`https://sepolia.etherscan.io/tx/${nativeHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              查看
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
