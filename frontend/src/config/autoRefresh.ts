/**
 * 自动刷新管理
 * 控制区块监听和数据自动更新
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AutoRefreshState {
  // 状态
  enabled: boolean;
  interval: number; // 刷新间隔（毫秒）
  blockWatching: boolean; // 是否监听区块
  
  // 操作
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  setInterval: (interval: number) => void;
  setBlockWatching: (watching: boolean) => void;
}

// 如果没有 zustand，使用简单的状态管理
class AutoRefreshManager {
  private enabled: boolean = false;
  private interval: number = 30000; // 默认30秒
  private blockWatching: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // 从 localStorage 读取设置
    const stored = localStorage.getItem('autoRefreshSettings');
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        this.enabled = settings.enabled ?? false;
        this.interval = settings.interval ?? 30000;
        this.blockWatching = settings.blockWatching ?? false;
      } catch (e) {
        console.error('Failed to load auto refresh settings:', e);
      }
    }
  }

  private save() {
    localStorage.setItem('autoRefreshSettings', JSON.stringify({
      enabled: this.enabled,
      interval: this.interval,
      blockWatching: this.blockWatching
    }));
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // 订阅变化
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 获取状态
  getState() {
    return {
      enabled: this.enabled,
      interval: this.interval,
      blockWatching: this.blockWatching
    };
  }

  // 切换开关
  toggle() {
    this.enabled = !this.enabled;
    this.save();
    this.notify();
    
    // 如果关闭了自动刷新，也关闭区块监听
    if (!this.enabled) {
      this.blockWatching = false;
    }
    
    console.log(`🔄 自动刷新: ${this.enabled ? '开启' : '关闭'}`);
  }

  // 设置启用状态
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.blockWatching = false;
    }
    this.save();
    this.notify();
  }

  // 设置刷新间隔
  setInterval(interval: number) {
    this.interval = interval;
    this.save();
    this.notify();
  }

  // 设置区块监听
  setBlockWatching(watching: boolean) {
    // 只有在自动刷新开启时才能开启区块监听
    this.blockWatching = this.enabled && watching;
    this.save();
    this.notify();
  }
}

// 创建单例
export const autoRefreshManager = new AutoRefreshManager();

// React Hook
import { useEffect, useState } from 'react';

export function useAutoRefresh() {
  const [state, setState] = useState(autoRefreshManager.getState());

  useEffect(() => {
    // 订阅变化
    const unsubscribe = autoRefreshManager.subscribe(() => {
      setState(autoRefreshManager.getState());
    });

    return unsubscribe;
  }, []);

  return {
    ...state,
    toggle: () => autoRefreshManager.toggle(),
    setEnabled: (enabled: boolean) => autoRefreshManager.setEnabled(enabled),
    setInterval: (interval: number) => autoRefreshManager.setInterval(interval),
    setBlockWatching: (watching: boolean) => autoRefreshManager.setBlockWatching(watching)
  };
}

// 导出便捷函数
export function isAutoRefreshEnabled() {
  return autoRefreshManager.getState().enabled;
}

export function getRefreshInterval() {
  return autoRefreshManager.getState().interval;
}

export function isBlockWatchingEnabled() {
  return autoRefreshManager.getState().blockWatching;
}
