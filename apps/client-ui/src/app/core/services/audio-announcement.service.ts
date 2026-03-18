import { Injectable } from '@angular/core'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

@Injectable({ providedIn: 'root' })
export class AudioAnnouncementService {
  private queue: string[] = []
  private speaking = false
  private speechVolume = 1
  private speechRate = 1

  setSpeechVolume(volume: number) {
    this.speechVolume = clamp(volume, 0, 1)
  }

  setSpeechRate(rate: number) {
    this.speechRate = clamp(rate, 0.6, 3.0)
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
    if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
      return
    }

    const AudioCtx = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? AudioContext
    const ctx = new AudioCtx()
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

    oscillator.onended = () => ctx.close()
  }

  unlock() {
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
}
