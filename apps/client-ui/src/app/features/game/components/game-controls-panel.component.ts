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
  @Input({ required: true }) isHost = false
  @Input({ required: true }) onToggleAudio!: (enabled: boolean) => void
  @Input({ required: true }) onEndLobby!: () => void

  confirmingEnd = false

  toggleAudio(enabled: boolean) {
    this.onToggleAudio(enabled)
  }

  endLobby() {
    this.onEndLobby()
    this.confirmingEnd = false
  }
}
