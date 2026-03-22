import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'

@Component({
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <div class="page-shell legal-page-shell">
      <div class="panel legal-page-panel">
        <div class="legal-page-top">
          <div>
            <p class="legal-page-eyebrow">{{ 'legalFooterLabel' | t }}</p>
            <h1 class="legal-page-title">{{ 'legalImprintTitle' | t }}</h1>
          </div>

          <div class="legal-page-actions">
            @if (session.lastLobbyCode()) {
              <button
                type="button"
                class="btn"
                [disabled]="store.loading()"
                (click)="reconnectLast()"
              >
                {{ 'reconnect' | t }}
              </button>
            }

            <a routerLink="/" class="btn btn-outline legal-page-back-link">
              {{ 'legalBackHome' | t }}
            </a>
          </div>
        </div>

        @if (store.error()) {
          <div class="error-box">{{ store.error() }}</div>
        }

        <div class="grid legal-page-grid">
          <section class="panel legal-page-section">
            <h2 class="legal-page-section-title">
              {{ 'legalImprintResponsibleLabel' | t }}
            </h2>
            <p>{{ 'legalImprintResponsibleValue' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h2 class="legal-page-section-title">
              {{ 'legalImprintAddressLabel' | t }}
            </h2>
            <p>{{ 'legalImprintAddressValue' | t }}</p>
          </section>

          <section class="panel legal-page-section legal-page-section-full">
            <h2 class="legal-page-section-title">
              {{ 'legalImprintContactLabel' | t }}
            </h2>
            <p>{{ 'legalImprintContactValue' | t }}</p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .legal-page-shell {
        max-width: 980px;
        padding-top: 24px;
        padding-bottom: 24px;
      }

      .legal-page-panel {
        display: grid;
        gap: 18px;
      }

      .legal-page-top {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }

      .legal-page-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .legal-page-eyebrow {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .legal-page-title {
        margin: 0;
      }

      .legal-page-intro,
      .legal-page-section p {
        margin: 0;
        line-height: 1.6;
      }

      .legal-page-note {
        color: var(--muted);
      }

      .legal-page-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .legal-page-section {
        gap: 10px;
      }

      .legal-page-section-title {
        margin: 0 0 8px;
        font-size: 16px;
      }

      .legal-page-section p {
        white-space: pre-line;
      }

      .legal-page-section-full {
        grid-column: 1 / -1;
      }

      .legal-page-back-link {
        white-space: nowrap;
      }

      @media (max-width: 700px) {
        .legal-page-shell {
          padding-top: 12px;
          padding-bottom: 20px;
        }

        .legal-page-top {
          flex-direction: column;
        }

        .legal-page-actions {
          width: 100%;
        }

        .legal-page-grid {
          grid-template-columns: 1fr;
        }

        .legal-page-section-full {
          grid-column: auto;
        }

        .legal-page-back-link {
          width: 100%;
          text-align: center;
        }
      }
    `,
  ],
})
export class LegalImprintPageComponent {
  protected readonly session = inject(SessionService)
  protected readonly store = inject(AppStore)
  private readonly facade = inject(GameFacadeService)

  reconnectLast() {
    const code = this.session.lastLobbyCode()

    if (!code) {
      return
    }

    this.facade.reconnectLobby(code)
  }
}
