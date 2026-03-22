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
            <h1 class="legal-page-title">{{ 'legalPrivacyTitle' | t }}</h1>
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

        <h2 class="legal-page-chapter">{{ 'legalPrivacyChapter1' | t }}</h2>

        <div class="legal-page-sections">
          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyOverviewTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyOverviewBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyDataRecTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyDataRecBody' | t }}</p>
          </section>
        </div>

        <h2 class="legal-page-chapter">{{ 'legalPrivacyChapter2' | t }}</h2>

        <div class="legal-page-sections">
          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyProtectionTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyProtectionBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyControllerTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyControllerBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyStorageDurTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyStorageDurBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyLegalBasisTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyLegalBasisBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyRecipientsTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyRecipientsBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyRevocationTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyRevocationBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyObjectionTitle' | t }}
            </h3>
            <p class="legal-page-block-notice">
              {{ 'legalPrivacyObjectionBody' | t }}
            </p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyComplaintTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyComplaintBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyPortabilityTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyPortabilityBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyAccessTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyAccessBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacyRestrictionTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacyRestrictionIntro' | t }}</p>
            <ul class="legal-page-list">
              <li>{{ 'legalPrivacyRestrictionItem1' | t }}</li>
              <li>{{ 'legalPrivacyRestrictionItem2' | t }}</li>
              <li>{{ 'legalPrivacyRestrictionItem3' | t }}</li>
              <li>{{ 'legalPrivacyRestrictionItem4' | t }}</li>
            </ul>
            <p>{{ 'legalPrivacyRestrictionOutro' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacySSLTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacySSLBody' | t }}</p>
          </section>

          <section class="panel legal-page-section">
            <h3 class="legal-page-section-title">
              {{ 'legalPrivacySpamTitle' | t }}
            </h3>
            <p>{{ 'legalPrivacySpamBody' | t }}</p>
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

      .legal-page-chapter {
        margin: 4px 0 0;
        font-size: 17px;
        color: var(--muted);
        font-weight: 600;
      }

      .legal-page-sections {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .legal-page-section {
        gap: 10px;
      }

      .legal-page-section-title {
        margin: 0 0 8px;
        font-size: 16px;
      }

      .legal-page-section p {
        margin: 0;
        line-height: 1.6;
        white-space: pre-line;
      }

      .legal-page-section p + p {
        margin-top: 8px;
      }

      .legal-page-block-notice {
        font-size: 0.88em;
        line-height: 1.55;
      }

      .legal-page-list {
        margin: 6px 0 8px;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        line-height: 1.6;
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

        .legal-page-back-link {
          width: 100%;
          text-align: center;
        }
      }
    `,
  ],
})
export class LegalPrivacyPageComponent {
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
