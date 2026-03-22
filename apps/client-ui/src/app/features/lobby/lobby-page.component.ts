import {
  ChangeDetectorRef,
  Component,
  NgZone,
  inject,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import type { SpecialCard, SpecialCardKey } from '@wizard/shared'
import { SPECIAL_CARD_KEYS } from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationKey } from '../../core/i18n/translations'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { CardComponent } from '../../shared/components/card.component'
import { TPipe } from '../../shared/pipes/t.pipe'

@Component({
  standalone: true,
  imports: [FormsModule, TPipe, RouterLink, CardComponent],
  template: `
    <div class="page-shell">
      @if (!store.lobby()) {
        <div class="panel">
          <h2 style="margin-top: 0;">{{ 'lobby' | t }} {{ routeCode }}</h2>

          @if (store.error()) {
            <div class="error-box" style="margin-bottom: 16px;">
              {{ store.error() }}
            </div>
          }

          <label class="label">{{ 'playerName' | t }}</label>
          <input class="input" [(ngModel)]="playerName" />

          <div class="row" style="margin-top: 16px;">
            <button
              class="btn btn-primary"
              [disabled]="store.loading() || !routeCode"
              (click)="enterCurrentLobby()"
            >
              {{
                store.loading()
                  ? ('loading' | t)
                  : isRouteLobbyRunning()
                    ? ('watchAsSpectator' | t)
                    : ('joinThisLobby' | t)
              }}
            </button>

            <a routerLink="/" class="btn">{{ 'back' | t }}</a>
          </div>
        </div>
      } @else {
        <div class="grid lobby-main-grid">
          <div class="panel">
            <div class="spread">
              <div>
                <h2 style="margin: 0;">
                  {{ 'lobby' | t }} {{ store.lobby()!.code }}
                </h2>
                <div class="row" style="margin-top: 8px;">
                  <button class="btn" (click)="copyCode()">
                    {{ 'copyCode' | t }}
                  </button>
                  @if (copied) {
                    <span class="status-pill">{{ 'copied' | t }}</span>
                  }
                </div>
              </div>

              <span class="status-pill">
                {{ lobbyStatusKey(store.lobby()!.status) | t }}
              </span>
            </div>

            @if (store.error()) {
              <div class="error-box" style="margin-top: 14px;">
                {{ store.error() }}
              </div>
            }

            <div style="margin-top: 16px;">
              <h3>{{ 'players' | t }}</h3>
              <div class="grid">
                @for (player of store.lobby()!.players; track player.id) {
                  <div class="panel">
                    <div class="spread">
                      <strong>
                        {{ player.name }}
                        @if (player.id === store.playerId()) {
                          ({{ 'self' | t }})
                        }
                      </strong>

                      <span
                        class="status-pill"
                        [class]="
                          player.connected ? 'status-online' : 'status-offline'
                        "
                      >
                        {{
                          player.connected
                            ? ('connected' | t)
                            : ('disconnected' | t)
                        }}
                      </span>
                    </div>

                    <div class="row" style="margin-top: 10px;">
                      <span class="muted">{{ roleKey(player.role) | t }}</span>

                      @if (
                        isHost() && player.id !== store.lobby()!.hostPlayerId
                      ) {
                        <button
                          class="btn btn-danger"
                          (click)="kick(player.id)"
                        >
                          {{ 'kick' | t }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="row" style="margin-top: 16px;">
              @if (isHost()) {
                <button
                  class="btn btn-primary"
                  [disabled]="store.loading()"
                  (click)="startGame()"
                >
                  {{ store.loading() ? ('loading' | t) : ('startGame' | t) }}
                </button>

                <button class="btn btn-danger" (click)="endLobby()">
                  {{ 'closeLobby' | t }}
                </button>
              } @else {
                <button class="btn btn-danger" (click)="leaveLobby()">
                  {{ 'leaveLobby' | t }}
                </button>
              }
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="panel">
              <h3>{{ 'rules' | t }}</h3>

              <div [style.opacity]="isHost() ? 1 : 0.55">
                <label class="label">
                  {{ 'predictionVisibilityLabel' | t }}
                  <button
                    type="button"
                    class="info-icon"
                    [attr.aria-label]="i18n.t('predictionVisibilityInfo')"
                    (click)="toggleRuleInfo('predictionVisibility')"
                  >
                    ?
                  </button>
                </label>
                @if (activeRuleInfo() === 'predictionVisibility') {
                  <div class="rule-info-box">
                    {{ i18n.t('predictionVisibilityInfo') }}
                  </div>
                }

                <select
                  class="select"
                  [disabled]="!isHost()"
                  [ngModel]="store.lobby()!.config.predictionVisibility"
                  (ngModelChange)="setPredictionVisibility($event)"
                >
                  <option value="open">{{ 'predictionOpen' | t }}</option>
                  <option value="hidden">{{ 'predictionHidden' | t }}</option>
                  <option value="secret">{{ 'predictionSecret' | t }}</option>
                </select>

                <label
                  class="label"
                  style="margin-top: 14px;"
                  [style.opacity]="
                    !isHost()
                      ? 1
                      : store.lobby()!.config.predictionVisibility !== 'open'
                        ? 0.55
                        : 1
                  "
                >
                  {{ 'openRestrictionLabel' | t }}
                  <button
                    type="button"
                    class="info-icon"
                    [attr.aria-label]="i18n.t('openRestrictionInfo')"
                    (click)="toggleRuleInfo('openRestriction')"
                  >
                    ?
                  </button>
                </label>
                @if (activeRuleInfo() === 'openRestriction') {
                  <div class="rule-info-box">
                    {{ i18n.t('openRestrictionInfo') }}
                  </div>
                }

                <select
                  class="select"
                  [style.opacity]="
                    !isHost()
                      ? 1
                      : store.lobby()!.config.predictionVisibility !== 'open'
                        ? 0.55
                        : 1
                  "
                  [disabled]="
                    !isHost() ||
                    store.lobby()!.config.predictionVisibility !== 'open'
                  "
                  [ngModel]="store.lobby()!.config.openPredictionRestriction"
                  (ngModelChange)="setPredictionRestriction($event)"
                >
                  <option value="none">
                    {{ 'predictionRestrictionNone' | t }}
                  </option>
                  <option value="mustEqualTricks">
                    {{ 'predictionRestrictionMustEqual' | t }}
                  </option>
                  <option value="mustNotEqualTricks">
                    {{ 'predictionRestrictionMustNotEqual' | t }}
                  </option>
                </select>
              </div>
            </div>

            <div class="panel">
              <h3 style="margin-top: 0; margin-bottom: 4px;">
                {{ 'specialCardsLabel' | t }}
                <button
                  type="button"
                  class="info-icon"
                  [attr.aria-label]="i18n.t('specialCardsInfo')"
                  (click)="toggleRuleInfo('specialCards')"
                >
                  ?
                </button>
              </h3>
              @if (activeRuleInfo() === 'specialCards') {
                <div class="rule-info-box" style="margin-bottom: 10px;">
                  {{ i18n.t('specialCardsInfo') }}
                </div>
              }

              <div
                style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;"
              >
                @for (card of specialCards; track card.id) {
                  @let isEnabled = isSpecialCardEnabled(card.special);
                  <div
                    [style.cursor]="isHost() ? 'pointer' : 'default'"
                    [style.opacity]="isEnabled ? '1' : '0.45'"
                    [style.filter]="isEnabled ? 'none' : 'grayscale(0.4)'"
                    (click)="toggleSpecialCard(card.special)"
                  >
                    <wiz-card
                      [card]="card"
                      [disabled]="false"
                      [showSpecialInfo]="true"
                      [play]="noopPlay"
                    />
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .lobby-main-grid {
        grid-template-columns: 360px 1fr;
      }

      .rule-info-box {
        margin-bottom: 10px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: rgb(15 23 42 / 0.72);
        color: var(--muted);
        padding: 8px 10px;
        font-size: 13px;
        line-height: 1.3;
        white-space: pre-line;
      }

      .info-icon {
        appearance: none;
        background: transparent;
        padding: 0;
      }

      @media (max-width: 1100px) {
        .lobby-main-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LobbyPageComponent {
  private readonly route = inject(ActivatedRoute)
  protected readonly i18n = inject(I18nService)

  protected readonly store = this.appStore
  private readonly activeRuleInfoState = signal<
    'predictionVisibility' | 'openRestriction' | 'specialCards' | null
  >(null)
  copied = false
  private copiedTimeoutId: ReturnType<typeof setTimeout> | null = null

  routeCode = this.route.snapshot.paramMap.get('code')?.toUpperCase() ?? ''
  playerName = this.session.playerName()

  readonly specialCards: SpecialCard[] = SPECIAL_CARD_KEYS.map((key) => ({
    id: `special-${key}`,
    type: 'special' as const,
    special: key,
    labelKey: `card.special.${key}` as `card.special.${SpecialCardKey}`,
  }))

  readonly noopPlay = () => {}

  readonly activeRuleInfo = this.activeRuleInfoState.asReadonly()

  constructor(
    private readonly appStore: AppStore,
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  lobbyStatusKey(status: string): TranslationKey {
    return `lobbyStatus_${status.toLowerCase()}` as TranslationKey
  }

  roleKey(role: string): TranslationKey {
    return `role_${role.toLowerCase()}` as TranslationKey
  }

  toggleRuleInfo(
    key: 'predictionVisibility' | 'openRestriction' | 'specialCards',
  ) {
    this.activeRuleInfoState.update((current) => (current === key ? null : key))
  }

  isHost() {
    const lobby = this.store.lobby()
    const playerId = this.store.playerId()

    return !!lobby && !!playerId && lobby.hostPlayerId === playerId
  }

  copyCode() {
    const code = this.store.lobby()?.code

    if (!code) {
      return
    }

    this.ngZone.run(() => {
      this.copied = true
      this.cdr.markForCheck()

      if (this.copiedTimeoutId) {
        clearTimeout(this.copiedTimeoutId)
      }

      this.copiedTimeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          this.copied = false
          this.copiedTimeoutId = null
          this.cdr.markForCheck()
        })
      }, 2000)
    })

    navigator.clipboard.writeText(code).catch(() => {
      this.ngZone.run(() => {
        this.copied = false
        this.appStore.setError(this.i18n.t('copyFailed'))
        this.cdr.markForCheck()
      })
    })
  }

  joinCurrentLobby() {
    if (!this.playerName.trim() || !this.routeCode) {
      return
    }

    this.session.setPlayerName(this.playerName.trim())
    this.facade.joinLobby(this.routeCode, this.playerName.trim())
  }

  enterCurrentLobby() {
    if (this.isRouteLobbyRunning()) {
      this.spectateCurrentLobby()
      return
    }

    this.joinCurrentLobby()
  }

  spectateCurrentLobby() {
    if (!this.playerName.trim() || !this.routeCode) {
      return
    }

    this.session.setPlayerName(this.playerName.trim())
    this.facade.spectateLobby(this.routeCode, this.playerName.trim())
  }

  isRouteLobbyRunning() {
    const routeLobby = this.store
      .lobbyList()
      .find((lobby) => lobby.code === this.routeCode)

    if (!routeLobby) {
      return false
    }

    return routeLobby.status.trim().toLowerCase() === 'running'
  }

  leaveLobby() {
    const lobby = this.store.lobby()

    if (!lobby) {
      return
    }

    this.facade.leaveLobby(lobby.code)
  }

  kick(targetPlayerId: string) {
    const lobby = this.store.lobby()

    if (!lobby) {
      return
    }

    this.facade.kickPlayer(lobby.code, targetPlayerId)
  }

  startGame() {
    const lobby = this.store.lobby()

    if (!lobby) {
      return
    }

    if (lobby.players.length < 3) {
      this.appStore.setError(this.i18n.t('minPlayersRequired'))
      return
    }

    this.facade.startGame(lobby.code)
  }

  endLobby() {
    const lobby = this.store.lobby()

    if (!lobby) {
      return
    }

    this.facade.endLobby(lobby.code)
  }

  setPredictionVisibility(predictionVisibility: 'open' | 'hidden' | 'secret') {
    const lobby = this.store.lobby()

    if (!lobby || !this.isHost()) {
      return
    }

    this.facade.updateConfig(lobby.code, { predictionVisibility })
  }

  setPredictionRestriction(
    openPredictionRestriction:
      | 'none'
      | 'mustEqualTricks'
      | 'mustNotEqualTricks',
  ) {
    const lobby = this.store.lobby()

    if (!lobby || !this.isHost()) {
      return
    }

    this.facade.updateConfig(lobby.code, { openPredictionRestriction })
  }

  isSpecialCardEnabled(key: SpecialCardKey): boolean {
    return (
      this.store.lobby()?.config.includedSpecialCards?.includes(key) ?? true
    )
  }

  toggleSpecialCard(key: SpecialCardKey) {
    const lobby = this.store.lobby()

    if (!lobby || !this.isHost()) {
      return
    }

    const current = lobby.config.includedSpecialCards ?? [...SPECIAL_CARD_KEYS]
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]

    this.facade.updateConfig(lobby.code, { includedSpecialCards: next })
  }
}
