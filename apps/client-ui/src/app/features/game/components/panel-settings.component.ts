import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'wiz-panel-settings',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="panel-settings">
      <button
        type="button"
        class="btn panel-settings-toggle"
        (click)="toggleOpen()"
        [attr.aria-expanded]="isOpen"
        aria-controls="panel-settings-content"
      >
        {{ 'panelSettingsLabel' | t }}
      </button>

      @if (isOpen) {
        <div
          id="panel-settings-content"
          class="panel panel-settings-content"
          role="group"
          [attr.aria-label]="'panelSettingsLabel' | t"
        >
          <label class="row">
            <input
              type="checkbox"
              [ngModel]="settingsVisible"
              (ngModelChange)="settingsChange.emit($event)"
            />
            <span>{{ 'settings' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="playersVisible"
              (ngModelChange)="playersChange.emit($event)"
            />
            <span>{{ 'players' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="scoreboardVisible"
              (ngModelChange)="scoreboardChange.emit($event)"
            />
            <span>{{ 'scoreboard' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="logVisible"
              (ngModelChange)="logChange.emit($event)"
            />
            <span>{{ 'logs' | t }}</span>
          </label>

          <label class="row" style="margin-top: 8px;">
            <input
              type="checkbox"
              [ngModel]="chatVisible"
              (ngModelChange)="chatChange.emit($event)"
            />
            <span>{{ 'chat' | t }}</span>
          </label>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .panel-settings {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .panel-settings-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
      }

      .panel-settings-content {
        padding: 10px 12px;
        min-width: 180px;
      }
    `,
  ],
})
export class PanelSettingsComponent {
  @Input({ required: true }) settingsVisible = true
  @Input({ required: true }) playersVisible = true
  @Input({ required: true }) scoreboardVisible = true
  @Input({ required: true }) logVisible = true
  @Input({ required: true }) chatVisible = true

  @Output() readonly settingsChange = new EventEmitter<boolean>()
  @Output() readonly playersChange = new EventEmitter<boolean>()
  @Output() readonly scoreboardChange = new EventEmitter<boolean>()
  @Output() readonly logChange = new EventEmitter<boolean>()
  @Output() readonly chatChange = new EventEmitter<boolean>()

  isOpen = false

  toggleOpen() {
    this.isOpen = !this.isOpen
  }
}
