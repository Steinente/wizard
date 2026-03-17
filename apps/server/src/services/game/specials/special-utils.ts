import crypto from 'node:crypto'

export const createDecisionId = () => crypto.randomUUID()
export const nowIso = () => new Date().toISOString()
