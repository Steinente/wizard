import type { GameChatMessage } from '@wizard/shared'

const normalizeCode = (code: string) => code.trim().toUpperCase()

const lobbyChatMessages = new Map<string, GameChatMessage[]>()

export const LOBBY_CHAT_MESSAGE_LIMIT = 200

export const getLobbyChatMessages = (code: string): GameChatMessage[] => [
  ...(lobbyChatMessages.get(normalizeCode(code)) ?? []),
]

export const setLobbyChatMessages = (
  code: string,
  messages: GameChatMessage[],
) => {
  const normalizedCode = normalizeCode(code)

  if (!messages.length) {
    lobbyChatMessages.delete(normalizedCode)
    return
  }

  lobbyChatMessages.set(normalizedCode, messages)
}

export const clearLobbyChatMessages = (code: string) => {
  lobbyChatMessages.delete(normalizeCode(code))
}
