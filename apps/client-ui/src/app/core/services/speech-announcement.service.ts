import { Injectable } from '@angular/core'
import {
  normalizeSpeechRate,
  normalizeSpeechVolume,
} from '../config/speech.config'

@Injectable({ providedIn: 'root' })
export class SpeechAnnouncementService {
  private queue: string[] = []
  private speaking = false
  private speechVolume = 1
  private speechRate = 1
  private audioContext: AudioContext | null = null
  private audioContextUnlocked = false

  constructor() {
    this.registerGestureUnlockListeners()
  }

  setSpeechVolume(volume: number) {
    this.speechVolume = normalizeSpeechVolume(volume)
  }

  setSpeechRate(rate: number) {
    this.speechRate = normalizeSpeechRate(rate)
  }

  speak(text: string) {
    if (
      !text ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return
    }

    this.queue.push(text)
    this.trySpeakNext()
  }

  bing() {
    if (!this.audioContextUnlocked) {
      return
    }

    const ctx = this.ensureAudioContext()

    if (!ctx) {
      return
    }

    void ctx.resume().then(() => {
      if (ctx.state !== 'running') {
        return
      }

      this.playBingTone(ctx)
    })
  }

  unlock() {
    this.unlockAudioContext()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const utterance = new SpeechSynthesisUtterance('')
    utterance.volume = 0
    window.speechSynthesis.speak(utterance)
  }

  clear() {
    this.queue = []
    this.speaking = false

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  private trySpeakNext() {
    if (this.speaking || !this.queue.length || typeof window === 'undefined') {
      return
    }

    const next = this.queue.shift()

    if (!next) {
      return
    }

    this.speaking = true

    const utterance = new SpeechSynthesisUtterance(next)
    utterance.volume = this.speechVolume
    utterance.rate = this.speechRate
    utterance.pitch = 1

    utterance.onend = () => {
      this.speaking = false
      this.trySpeakNext()
    }

    utterance.onerror = () => {
      this.speaking = false
      this.trySpeakNext()
    }

    window.speechSynthesis.speak(utterance)
  }

  private playBingTone(ctx: AudioContext) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08)

    const startGain = Math.max(0.001, 0.4 * this.speechVolume)
    gain.gain.setValueAtTime(startGain, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)

    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }

  private unlockAudioContext() {
    const ctx = this.ensureAudioContext()

    if (!ctx) {
      return
    }

    void ctx
      .resume()
      .then(() => {
        this.audioContextUnlocked = ctx.state === 'running'
      })
      .catch(() => {
        this.audioContextUnlocked = false
      })
  }

  private ensureAudioContext() {
    if (this.audioContext) {
      return this.audioContext
    }

    const AudioCtx = this.getAudioContextClass()

    if (!AudioCtx) {
      return null
    }

    this.audioContext = new AudioCtx()
    return this.audioContext
  }

  private getAudioContextClass() {
    if (
      typeof window === 'undefined' ||
      !('AudioContext' in window || 'webkitAudioContext' in window)
    ) {
      return null
    }

    return (window as typeof window & {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext ?? AudioContext
  }

  private registerGestureUnlockListeners() {
    if (typeof window === 'undefined') {
      return
    }

    const unlockOnGesture = () => {
      this.unlockAudioContext()
    }

    window.addEventListener('pointerdown', unlockOnGesture, {
      once: true,
      passive: true,
    })
    window.addEventListener('keydown', unlockOnGesture, {
      once: true,
      passive: true,
    })
  }
}
