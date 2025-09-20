// 全局状态管理 - 在serverless函数间共享状态
// 注意：这只在同一个执行环境中有效

export let globalState: 'waiting' | 'open' | 'closed' = 'waiting';
export let globalConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

export let globalParticipants: Record<string, {
  pid: number;
  participated: boolean;
  win: boolean;
  joinTime: string;
}> = {};

export function resetGlobalState() {
  globalState = 'waiting';
  globalConfig = { hongzhongPercent: 33, redCountMode: 1 };
  Object.keys(globalParticipants).forEach(key => delete globalParticipants[key]);
  console.log('Global state reset');
}

export function updateGlobalState(state: 'waiting' | 'open' | 'closed') {
  globalState = state;
}

export function updateGlobalConfig(config: Partial<typeof globalConfig>) {
  globalConfig = { ...globalConfig, ...config };
}

export function addGlobalParticipant(clientId: string, participant: {
  pid: number;
  participated: boolean;
  win: boolean;
  joinTime: string;
}) {
  globalParticipants[clientId] = participant;
}

export function getGlobalParticipant(clientId: string) {
  return globalParticipants[clientId];
}

export function getAllGlobalParticipants() {
  return Object.values(globalParticipants);
}
