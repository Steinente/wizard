import { Component, Input } from '@angular/core'
import { TPipe } from '../pipes/t.pipe'

@Component({
  selector: 'wiz-player-badge',
  standalone: true,
  imports: [TPipe],
  template: `
    <div
      class="panel"
      [style.outline]="active ? '3px solid #d4a72c' : '1px solid var(--border)'"
      [style.outlineOffset]="active ? '0' : '0'"
    >
      <div class="spread">
        <strong class="name-wrap">
          <span>{{ name }}</span>
          @if (showCloudIndicator) {
            <span class="cloud-indicator" title="Cloud adjustment pending">☁</span>
          }
        </strong>
        <span class="status-pill" [class]="connected ? 'status-online' : 'status-offline'">{{
          connected ? ('online' | t) : ('offline' | t)
        }}</span>
      </div>

      <div class="row" style="margin-top: 8px; flex-wrap: wrap;">
        <span class="muted">{{ 'seat' | t }} {{ seatIndex + 1 }}</span>
        <span class="muted">{{ 'tricks' | t }} {{ tricksWon }}</span>
        @if (prediction !== null) {
          <span class="muted">{{ 'bid' | t }} {{ prediction }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .name-wrap {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .cloud-indicator {
        font-size: 14px;
        line-height: 1;
        color: #4a90d9;
      }
    `,
  ],
})
export class PlayerBadgeComponent {
  @Input({ required: true }) name!: string
  @Input({ required: true }) connected!: boolean
  @Input({ required: true }) seatIndex!: number
  @Input() tricksWon = 0
  @Input() prediction: number | null = null
  @Input() active = false
  @Input() showCloudIndicator = false
}
