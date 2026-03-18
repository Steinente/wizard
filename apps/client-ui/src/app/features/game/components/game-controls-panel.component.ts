import { Component, Input } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { WizardGameViewState } from '@wizard/shared'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-game-controls-panel',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'controls' | t }}</h3>

      <div class="row">
        <label class="row">
          <input
            type="checkbox"
            [ngModel]="audioEnabled"
            (ngModelChange)="toggleAudio($event)"
          />
          <span>
            {{ audioEnabled ? ('audioEnabled' | t) : ('audioDisabled' | t) }}
          </span>
        </label>
      </div>

      <div class="row" style="margin-top: 8px;">
        <label class="row">
          <input
            type="checkbox"
            [ngModel]="bingEnabled"
            (ngModelChange)="toggleBing($event)"
          />
          <span>
            {{ bingEnabled ? ('bingEnabled' | t) : ('bingDisabled' | t) }}
          </span>
        </label>
      </div>

      <div style="margin-top: 12px;">
        <label class="label">{{ 'audioVolumeLabel' | t }}: {{ volumePercent() }}%</label>
        <input
          class="input"
          type="range"
          min="0"
          max="1"
          step="0.05"
          [ngModel]="audioVolume"
          (ngModelChange)="changeAudioVolume($event)"
        />
      </div>

      <div style="margin-top: 12px;">
        <label class="label">{{ 'audioSpeedLabel' | t }}: {{ speedValue() }}x</label>
        <input
          class="input"
          type="range"
          min="0.6"
          max="3.0"
          step="0.05"
          [ngModel]="audioSpeed"
          (ngModelChange)="changeAudioSpeed($event)"
        />
      </div>

      @if (isHost && !confirmingEnd) {
        <div style="margin-top: 12px;">
          <button class="btn btn-danger" (click)="confirmingEnd = true">
            {{ 'closeLobby' | t }}
          </button>
        </div>
      }

      @if (isHost && confirmingEnd) {
        <div style="margin-top: 12px;" class="row">
          <button class="btn btn-danger" (click)="endLobby()">
            {{ 'confirmCloseLobby' | t }}
          </button>
          <button class="btn" (click)="confirmingEnd = false">
            {{ 'cancel' | t }}
          </button>
        </div>
      }
    </div>
  `,
})
export class GameControlsPanelComponent {
  @Input({ required: true }) state!: WizardGameViewState
  @Input({ required: true }) audioEnabled = false
  @Input({ required: true }) audioVolume = 1
  @Input({ required: true }) audioSpeed = 1
  @Input({ required: true }) bingEnabled = true
  @Input({ required: true }) isHost = false
  @Input({ required: true }) onToggleAudio!: (enabled: boolean) => void
  @Input({ required: true }) onBingToggle!: (enabled: boolean) => void
  @Input({ required: true }) onAudioVolumeChange!: (volume: number) => void
  @Input({ required: true }) onAudioSpeedChange!: (speed: number) => void
  @Input({ required: true }) onEndLobby!: () => void

  confirmingEnd = false

  toggleAudio(enabled: boolean) {
    this.onToggleAudio(enabled)
  }

  toggleBing(enabled: boolean) {
    this.onBingToggle(enabled)
  }

  changeAudioVolume(value: number | string) {
    this.onAudioVolumeChange(Number(value))
  }

  changeAudioSpeed(value: number | string) {
    this.onAudioSpeedChange(Number(value))
  }

  volumePercent() {
    return Math.round(this.audioVolume * 100)
  }

  speedValue() {
    return this.audioSpeed.toFixed(2)
  }

  endLobby() {
    this.onEndLobby()
    this.confirmingEnd = false
  }
}
