import { useAutoRefresh } from '../config/autoRefresh';
import { useState } from 'react';

export function AutoRefreshControl() {
  const { enabled, interval, blockWatching, toggle, setInterval, setBlockWatching } = useAutoRefresh();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            🔄 自动刷新
          </h3>
          {enabled && (
            <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></span>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {enabled && (
        <>
          <div className="text-xs text-gray-600 mb-2">
            <div className="flex items-center gap-2">
              <span>状态:</span>
              <span className="text-green-600 font-medium">监听中</span>
              <span className="text-gray-400">|</span>
              <span>间隔: {interval / 1000}秒</span>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {showSettings ? '隐藏设置' : '显示设置'}
          </button>

          {showSettings && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              {/* 刷新间隔 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  刷新间隔
                </label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value={5000}>5秒（费用高）</option>
                  <option value={10000}>10秒</option>
                  <option value={30000}>30秒（推荐）</option>
                  <option value={60000}>1分钟</option>
                  <option value={300000}>5分钟（省流量）</option>
                </select>
              </div>

              {/* 区块监听 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    区块监听
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    实时监听新区块（消耗较多）
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blockWatching}
                    onChange={(e) => setBlockWatching(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* 消耗提示 */}
              <div className="p-2 bg-amber-50 rounded text-xs">
                <p className="text-amber-800 font-medium mb-1">💡 消耗估算：</p>
                <ul className="text-amber-700 space-y-0.5 ml-3">
                  <li>• 区块监听: ~100 CU/分钟</li>
                  <li>• 数据刷新: ~50 CU/次</li>
                  <li>• 当前设置: ~{blockWatching ? 150 : 50} CU/分钟</li>
                </ul>
                <p className="text-amber-600 mt-1">
                  月度预估: {((blockWatching ? 150 : 50) * 60 * 24 * 30 / 1000000).toFixed(1)}M CU
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {!enabled && (
        <div className="text-xs text-gray-500">
          <p>已暂停自动刷新，点击开关启用</p>
          <p className="mt-1 text-gray-400">这将减少 API 调用，节省配额</p>
        </div>
      )}
    </div>
  );
}
