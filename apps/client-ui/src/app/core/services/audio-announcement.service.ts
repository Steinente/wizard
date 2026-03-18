import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class AudioAnnouncementService {
  private queue: string[] = []
  private speaking = false

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

    gain.gain.setValueAtTime(0.4, ctx.currentTime)
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
    utterance.rate = 1
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
