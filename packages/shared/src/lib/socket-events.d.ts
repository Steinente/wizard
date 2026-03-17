import type { GameConfig } from './game-config.js';
import type { WizardGameState } from './game/state.js';
import type { LobbySummary } from './lobby.js';
export interface ClientToServerEvents {
    'lobby:create': (payload: {
        playerName: string;
        sessionToken: string;
        config?: Partial<GameConfig>;
    }) => void;
    'lobby:join': (payload: {
        code: string;
        playerName: string;
        sessionToken: string;
    }) => void;
    'lobby:reconnect': (payload: {
        code: string;
        sessionToken: string;
    }) => void;
    'lobby:updateConfig': (payload: {
        code: string;
        sessionToken: string;
        config: Partial<GameConfig>;
    }) => void;
    'lobby:kickPlayer': (payload: {
        code: string;
        sessionToken: string;
        targetPlayerId: string;
    }) => void;
    'game:start': (payload: {
        code: string;
        sessionToken: string;
    }) => void;
    'game:makePrediction': (payload: {
        code: string;
        sessionToken: string;
        value: number;
    }) => void;
    'game:playCard': (payload: {
        code: string;
        sessionToken: string;
        cardId: string;
    }) => void;
    'game:selectTrumpSuit': (payload: {
        code: string;
        sessionToken: string;
        suit: 'red' | 'yellow' | 'green' | 'blue';
    }) => void;
    'player:setAudioEnabled': (payload: {
        code: string;
        sessionToken: string;
        enabled: boolean;
    }) => void;
}
export interface ServerToClientEvents {
    'lobby:created': (payload: {
        lobby: LobbySummary;
    }) => void;
    'lobby:joined': (payload: {
        lobby: LobbySummary;
        playerId: string;
    }) => void;
    'lobby:updated': (payload: {
        lobby: LobbySummary;
    }) => void;
    'lobby:closed': (payload: {
        code: string;
        reason: string;
    }) => void;
    'game:state': (payload: {
        state: WizardGameState;
    }) => void;
    'game:event': (payload: {
        type: 'predictionAccepted' | 'cardPlayed' | 'trickResolved' | 'roundScored' | 'specialEffect' | 'audioPreferenceChanged';
        messageKey: string;
        params?: Record<string, string | number | boolean | null>;
    }) => void;
    'error:message': (payload: {
        message: string;
        code?: string;
    }) => void;
}
