// 共享状态存储
export let currentState: 'waiting' | 'open' | 'closed' = 'waiting';
export let currentConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

// 状态更新函数
export function updateState(newState: 'waiting' | 'open' | 'closed') {
  currentState = newState;
  return currentState;
}

export function updateConfig(newConfig: Partial<typeof currentConfig>) {
  currentConfig = { ...currentConfig, ...newConfig };
  return currentConfig;
}

export function getState() {
  return currentState;
}

export function getConfig() {
  return currentConfig;
}
