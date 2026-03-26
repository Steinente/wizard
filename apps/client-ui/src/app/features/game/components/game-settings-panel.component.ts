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
  selector: 'wiz-game-settings-panel',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="panel settings-panel">
      <h3 style="margin-top: 0;">{{ 'settings' | t }}</h3>

      <div class="row">
        <label class="row">
          <input
            type="checkbox"
            [ngModel]="cardArtworkEnabled"
            (ngModelChange)="changeCardArtworkEnabled($event)"
          />
          <span>
            {{
              cardArtworkEnabled
                ? ('cardArtworkModeOn' | t)
                : ('cardArtworkModeOff' | t)
            }}
          </span>
        </label>
      </div>

      <div class="row" style="margin-top: 8px;">
        <label class="row">
          <input
            type="checkbox"
            [ngModel]="handSortEnabled"
            (ngModelChange)="toggleHandSort($event)"
          />
          <span>
            {{
              handSortEnabled
                ? ('handSortEnabled' | t)
                : ('handSortDisabled' | t)
            }}
          </span>
        </label>
      </div>

      <div class="row" style="margin-top: 8px;">
        <label class="row">
          <input
            type="checkbox"
            [ngModel]="scoreboardA11yMode"
            (ngModelChange)="changeScoreboardA11yMode($event)"
          />
          <span>
            {{
              scoreboardA11yMode
                ? ('a11yScoreboardModeOn' | t)
                : ('a11yScoreboardModeOff' | t)
            }}
          </span>
        </label>
      </div>

      <div class="row" style="margin-top: 8px;">
        <label class="row">
          <input
            type="checkbox"
            [ngModel]="showTimestamp"
            (ngModelChange)="changeShowTimestamp($event)"
          />
          <span>{{ 'logShowTimestamp' | t }}</span>
        </label>
      </div>

      <div class="row" style="margin-top: 8px;">
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

      <div style="margin-top: 12px;">
        <label class="label"
          >{{ 'soundVolumeLabel' | t }}: {{ volumePercent() }}%</label
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

      <div class="row" style="margin-top: 8px;">
        <label class="row">
          <input
            type="checkbox"
            [ngModel]="chatSoundEnabled"
            (ngModelChange)="toggleChatSound($event)"
          />
          <span>
            {{
              chatSoundEnabled
                ? ('chatSoundEnabled' | t)
                : ('chatSoundDisabled' | t)
            }}
          </span>
        </label>
      </div>

      @if (isHost && !confirmingEnd) {
        <div style="margin-top: 12px;">
          <button
            class="btn btn-danger compact-btn close-lobby-btn"
            (click)="confirmingEnd = true"
          >
            {{ 'closeLobby' | t }}
          </button>
        </div>
      }

      @if (isHost && confirmingEnd) {
        <div style="margin-top: 12px;" class="row confirm-end-actions">
          <button class="btn btn-danger compact-btn" (click)="endLobby()">
            {{ 'confirmCloseLobby' | t }}
          </button>
          <button class="btn compact-btn" (click)="confirmingEnd = false">
            {{ 'cancel' | t }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .settings-panel {
        padding: 10px;
      }

      .settings-panel .row {
        gap: 8px;
      }

      .settings-panel label,
      .settings-panel span,
      .settings-panel .label {
        font-size: 12px;
        line-height: 1.2;
      }

      .settings-panel .input {
        padding: 6px 8px;
      }

      .compact-btn {
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12px;
      }

      .confirm-end-actions {
        flex-direction: row-reverse;
        justify-content: space-between;
        width: 100%;
      }

      @media (max-width: 700px) {
        .close-lobby-btn {
          width: 100%;
        }

        .confirm-end-actions {
          flex-direction: column-reverse;
          justify-content: flex-start;
          align-items: stretch;
        }

        .confirm-end-actions .compact-btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class GameSettingsPanelComponent {
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
  @Input({ required: true }) chatSoundEnabled = true
  @Input({ required: true }) handSortEnabled = false
  @Input({ required: true }) isHost = false
  @Input({ required: true }) onToggleAudio!: (enabled: boolean) => void
  @Input({ required: true }) onBingToggle!: (enabled: boolean) => void
  @Input({ required: true }) onChatSoundToggle!: (enabled: boolean) => void
  @Input({ required: true }) onHandSortToggle!: (enabled: boolean) => void
  @Input({ required: true }) onAudioVolumeChange!: (volume: number) => void
  @Input({ required: true }) onAudioSpeedChange!: (speed: number) => void
  @Input({ required: true }) onEndLobby!: () => void
  @Input({ required: true }) showTimestamp = true
  @Input({ required: true }) onShowTimestampChange!: (show: boolean) => void
  @Input({ required: true }) scoreboardA11yMode = true
  @Input({ required: true }) onScoreboardA11yModeChange!: (
    enabled: boolean,
  ) => void
  @Input({ required: true }) cardArtworkEnabled = false
  @Input({ required: true }) onCardArtworkEnabledChange!: (
    enabled: boolean,
  ) => void

  confirmingEnd = false

  toggleAudio(enabled: boolean) {
    this.onToggleAudio(enabled)
  }

  toggleBing(enabled: boolean) {
    this.onBingToggle(enabled)
  }

  toggleChatSound(enabled: boolean) {
    this.onChatSoundToggle(enabled)
  }

  toggleHandSort(enabled: boolean) {
    this.onHandSortToggle(enabled)
  }

  changeAudioVolume(value: number | string) {
    this.onAudioVolumeChange(Number(value))
  }

  changeAudioSpeed(value: number | string) {
    this.onAudioSpeedChange(Number(value))
  }

  changeShowTimestamp(show: boolean) {
    this.onShowTimestampChange(show)
  }

  changeScoreboardA11yMode(enabled: boolean) {
    this.onScoreboardA11yModeChange(enabled)
  }

  changeCardArtworkEnabled(enabled: boolean) {
    this.onCardArtworkEnabledChange(enabled)
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
