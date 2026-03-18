import type { GameConfig } from './game-config.js';
import type { LobbyStatus } from './lobby-state.js';
import type { PlayerIdentity, PlayerLobbyState } from './player.js';
export interface LobbySummary {
    code: string;
    hostPlayerId: string;
    status: LobbyStatus;
    hasPassword: boolean;
    config: GameConfig;
    players: Array<PlayerIdentity & PlayerLobbyState>;
    createdAt: string;
    updatedAt: string;
}
