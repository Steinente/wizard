export const SPEECH_VOLUME_MIN = 0
export const SPEECH_VOLUME_MAX = 1
export const SPEECH_VOLUME_STEP = 0.05

export const SPEECH_RATE_MIN = 0.6
export const SPEECH_RATE_MAX = 3.0
export const SPEECH_RATE_STEP = 0.05

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const normalizeSpeechVolume = (value: number) =>
  clamp(value, SPEECH_VOLUME_MIN, SPEECH_VOLUME_MAX)

export const normalizeSpeechRate = (value: number) =>
  clamp(value, SPEECH_RATE_MIN, SPEECH_RATE_MAX)
