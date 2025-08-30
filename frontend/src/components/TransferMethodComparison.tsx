import { useState } from 'react';

interface ComparisonData {
  method: string;
  icon: string;
  gasCost: string;
  dataStorage: string;
  queryability: number; // 1-5 stars
  useCase: string;
  pros: string[];
  cons: string[];
}

const comparisonData: ComparisonData[] = [
  {
    method: '日志方式',
    icon: '📝',
    gasCost: '~50,000 Gas',
    dataStorage: '合约 Storage',
    queryability: 5,
    useCase: '需要频繁查询的业务数据',
    pros: [
      '数据永久存储在合约中',
      '查询效率高',
      '支持复杂的数据结构',
      '可以被 The Graph 索引'
    ],
    cons: [
      'Gas 费用中等',
      '需要部署合约',
      '数据公开透明'
    ]
  },
  {
    method: '合约转账',
    icon: '🔒',
    gasCost: '~80,000 Gas',
    dataStorage: '合约 Storage + 转账',
    queryability: 5,
    useCase: '支付场景 + 数据记录',
    pros: [
      '同时完成转账和记录',
      '数据永久存储',
      '支持事件索引',
      '适合对账场景'
    ],
    cons: [
      'Gas 费用最高',
      '操作复杂度增加',
      '需要合约审计'
    ]
  },
  {
    method: '原生转账',
    icon: '⚡',
    gasCost: '21,000 Gas',
    dataStorage: '交易 Input Data',
    queryability: 2,
    useCase: '简单标记、低成本场景',
    pros: [
      'Gas 费用最低',
      '操作简单直接',
      '无需部署合约',
      '最接近原生体验'
    ],
    cons: [
      '数据不在状态存储',
      '查询需要扫描交易',
      '不支持复杂查询',
      '难以被索引'
    ]
  }
];

export function TransferMethodComparison() {
  const [selectedMethod, setSelectedMethod] = useState<number>(0);
  const [showDetails, setShowDetails] = useState(false);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < count ? 'text-yellow-500' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">🔄 三种上链方式对比</h2>

      {/* 简要对比表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">方式</th>
              <th className="text-left py-2 px-3">Gas 费</th>
              <th className="text-left py-2 px-3">存储位置</th>
              <th className="text-left py-2 px-3">查询性</th>
              <th className="text-left py-2 px-3 hidden md:table-cell">适用场景</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((item, index) => (
              <tr 
                key={index}
                className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedMethod === index ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedMethod(index);
                  setShowDetails(true);
                }}
              >
                <td className="py-3 px-3">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.method}</span>
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    item.gasCost === '21,000 Gas' 
                      ? 'bg-green-100 text-green-700'
                      : item.gasCost === '~50,000 Gas'
                      ? 'bg-yellow-100 text-yellow-700'  
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {item.gasCost}
                  </span>
                </td>
                <td className="py-3 px-3 text-xs text-gray-600">
                  {item.dataStorage}
                </td>
                <td className="py-3 px-3">
                  {renderStars(item.queryability)}
                </td>
                <td className="py-3 px-3 text-xs text-gray-600 hidden md:table-cell">
                  {item.useCase}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-md font-medium flex items-center gap-2">
              <span className="text-xl">{comparisonData[selectedMethod].icon}</span>
              {comparisonData[selectedMethod].method} 详情
            </h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">✅ 优势</h4>
              <ul className="space-y-1">
                {comparisonData[selectedMethod].pros.map((pro, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">⚠️ 劣势</h4>
              <ul className="space-y-1">
                {comparisonData[selectedMethod].cons.map((con, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              <strong>💡 建议：</strong>
              {selectedMethod === 0 && '适合需要构建 DApp 或需要复杂查询的场景'}
              {selectedMethod === 1 && '适合需要同时处理支付和数据记录的业务场景'}
              {selectedMethod === 2 && '适合临时标记、简单备注或对成本敏感的场景'}
            </p>
          </div>
        </div>
      )}

      {/* 决策流程图 */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg">
        <h3 className="text-sm font-medium text-amber-900 mb-3">🎯 如何选择？</h3>
        <div className="space-y-2 text-sm text-amber-800">
          <div className="flex items-start">
            <span className="font-medium mr-2">1.</span>
            <span>
              <strong>需要转账吗？</strong> 
              → 是：选择合约转账或原生转账 
              → 否：选择日志方式
            </span>
          </div>
          <div className="flex items-start">
            <span className="font-medium mr-2">2.</span>
            <span>
              <strong>需要查询历史数据吗？</strong> 
              → 频繁查询：选择日志或合约转账 
              → 偶尔查询：原生转账也可以
            </span>
          </div>
          <div className="flex items-start">
            <span className="font-medium mr-2">3.</span>
            <span>
              <strong>对 Gas 费敏感吗？</strong> 
              → 非常敏感：选择原生转账 
              → 可以接受：根据功能需求选择
            </span>
          </div>
        </div>
      </div>

      {/* 实际案例 */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">📚 实际应用案例</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded">
            <h4 className="text-xs font-medium text-blue-900 mb-1">电商订单</h4>
            <p className="text-xs text-blue-700">
              使用<strong>日志方式</strong>记录订单信息，方便查询和统计
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <h4 className="text-xs font-medium text-green-900 mb-1">工资支付</h4>
            <p className="text-xs text-green-700">
              使用<strong>合约转账</strong>，同时完成支付和记录
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded">
            <h4 className="text-xs font-medium text-purple-900 mb-1">朋友转账</h4>
            <p className="text-xs text-purple-700">
              使用<strong>原生转账</strong>，附带简单备注即可
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
