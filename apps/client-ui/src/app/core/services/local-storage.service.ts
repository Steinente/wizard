import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private storage(): Storage | null {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null
    }

    return globalThis.localStorage
  }

  get(key: string): string | null {
    return this.storage()?.getItem(key) ?? null
  }

  set(key: string, value: string) {
    this.storage()?.setItem(key, value)
  }

  remove(key: string) {
    this.storage()?.removeItem(key)
  }
}
