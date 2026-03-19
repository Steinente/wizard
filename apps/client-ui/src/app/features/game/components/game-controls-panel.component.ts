import { Component, Input } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { WizardGameViewState } from '@wizard/shared'
import {
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  SPEECH_RATE_STEP,
  SPEECH_VOLUME_MAX,
  SPEECH_VOLUME_MIN,
  SPEECH_VOLUME_STEP,
} from '../../../core/config/speech.config'
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
            {{
              audioEnabled ? ('readLogEnabled' | t) : ('readLogDisabled' | t)
            }}
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
        <label class="label"
          >{{ 'speechVolumeLabel' | t }}: {{ volumePercent() }}%</label
        >
        <input
          class="input"
          type="range"
          [min]="speechVolumeMin"
          [max]="speechVolumeMax"
          [step]="speechVolumeStep"
          [ngModel]="audioVolume"
          (ngModelChange)="changeAudioVolume($event)"
        />
      </div>

      <div style="margin-top: 12px;">
        <label class="label"
          >{{ 'speechSpeedLabel' | t }}: {{ speedValue() }}x</label
        >
        <input
          class="input"
          type="range"
          [min]="speechRateMin"
          [max]="speechRateMax"
          [step]="speechRateStep"
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
  readonly speechVolumeMin = SPEECH_VOLUME_MIN
  readonly speechVolumeMax = SPEECH_VOLUME_MAX
  readonly speechVolumeStep = SPEECH_VOLUME_STEP
  readonly speechRateMin = SPEECH_RATE_MIN
  readonly speechRateMax = SPEECH_RATE_MAX
  readonly speechRateStep = SPEECH_RATE_STEP

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
