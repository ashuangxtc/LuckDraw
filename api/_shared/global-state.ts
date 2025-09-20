// 全局状态管理 - 在serverless函数间共享状态
// 注意：这只在同一个执行环境中有效

let _globalState: 'waiting' | 'open' | 'closed' = 'waiting';
let _globalConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

let _globalParticipants: Record<string, {
  pid: number;
  participated: boolean;
  win: boolean;
  joinTime: string;
}> = {};

export const globalState = () => _globalState;
export const globalConfig = () => _globalConfig;
export const globalParticipants = () => _globalParticipants;

export function resetGlobalState() {
  _globalState = 'waiting';
  _globalConfig = { hongzhongPercent: 33, redCountMode: 1 };
  Object.keys(_globalParticipants).forEach(key => delete _globalParticipants[key]);
  console.log('Global state reset');
}

export function updateGlobalState(state: 'waiting' | 'open' | 'closed') {
  _globalState = state;
}

export function updateGlobalConfig(config: Partial<typeof _globalConfig>) {
  _globalConfig = { ..._globalConfig, ...config };
}

export function addGlobalParticipant(clientId: string, participant: {
  pid: number;
  participated: boolean;
  win: boolean;
  joinTime: string;
}) {
  _globalParticipants[clientId] = participant;
}

export function getGlobalParticipant(clientId: string) {
  return _globalParticipants[clientId];
}

export function getAllGlobalParticipants() {
  return Object.values(_globalParticipants);
}
