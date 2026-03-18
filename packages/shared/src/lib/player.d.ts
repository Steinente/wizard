export type PlayerRole = 'host' | 'player' | 'spectator';
export interface PlayerIdentity {
    id: string;
    sessionToken: string;
    name: string;
    role: PlayerRole;
}
export interface PlayerLobbyState {
    playerId: string;
    connected: boolean;
    joinedAt: string;
    disconnectedAt: string | null;
}
