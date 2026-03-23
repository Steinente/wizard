import { Component, OnDestroy, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import type { LobbySummary } from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <div class="page-shell">
      <div class="panel" style="max-width: 620px; margin: 0 auto; width: 100%;">
        <h2 style="margin-top: 0;">{{ 'lobby' | t }} {{ routeCode }}</h2>

        @if (store.error()) {
          <div class="error-box" style="margin-bottom: 12px;">
            {{ store.error() }}
          </div>
        }

        <div class="panel" style="margin-bottom: 12px;">
          <div class="muted">
            @if (routeLobby(); as lobby) {
              {{ statusLabel(lobby.status) }} • {{ 'players' | t }}:
              {{ playingPlayersCount(lobby) }}/6
            } @else {
              {{ 'loading' | t }}...
            }
          </div>
        </div>

        <label class="label">{{ 'playerName' | t }}</label>
        <input class="input" [(ngModel)]="playerName" />

        @if (routeLobby()?.hasPassword) {
          <label class="label" style="margin-top: 12px;">{{
            'lobbyPassword' | t
          }}</label>
          <input class="input" [(ngModel)]="password" type="password" />
        }

        <div class="row" style="margin-top: 16px;">
          <button
            class="btn btn-primary"
            [disabled]="store.loading()"
            (click)="enterFromLink()"
          >
            {{
              store.loading()
                ? ('loading' | t)
                : canReconnectLobby()
                  ? ('reconnect' | t)
                  : isRouteLobbyRunning()
                    ? ('watchAsSpectator' | t)
                    : ('joinThisLobby' | t)
            }}
          </button>

          <a routerLink="/" class="btn">{{ 'back' | t }}</a>
        </div>
      </div>
    </div>
  `,
})
export class JoinPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute)
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null

  protected readonly store = this.appStore
  routeCode = this.route.snapshot.paramMap.get('code')?.toUpperCase() ?? ''
  playerName = this.session.playerName()
  password = ''

  constructor(
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
    private readonly appStore: AppStore,
    private readonly i18n: I18nService,
  ) {}

  ngOnInit() {
    this.refreshLobbies()
    this.refreshIntervalId = setInterval(() => {
      this.refreshLobbies()
    }, 5000)
  }

  ngOnDestroy() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId)
      this.refreshIntervalId = null
    }
  }

  routeLobby() {
    return this.store.lobbyList().find((lobby) => lobby.code === this.routeCode)
  }

  private isLobbyRunning(status: string) {
    return status.trim().toLowerCase() === 'running'
  }

  isRouteLobbyRunning() {
    const lobby = this.routeLobby()

    if (!lobby) {
      return false
    }

    return this.isLobbyRunning(lobby.status)
  }

  statusLabel(status: string) {
    return this.isLobbyRunning(status)
      ? this.i18n.t('lobbyStatusRunning')
      : this.i18n.t('lobbyStatusWaiting')
  }

  playingPlayersCount(lobby: LobbySummary) {
    return lobby.players.filter((player) => player.role !== 'spectator').length
  }

  canReconnectLobby() {
    const lobby = this.routeLobby()
    const token = this.session.sessionToken()

    if (!lobby) {
      return false
    }

    return lobby.players.some(
      (player) => player.sessionToken === token && player.role !== 'spectator',
    )
  }

  private currentActiveGameLobby(excludeCode?: string) {
    const token = this.session.sessionToken()
    const exclude = excludeCode?.trim().toUpperCase()

    return this.store
      .lobbyList()
      .find(
        (lobby) =>
          this.isLobbyRunning(lobby.status) &&
          lobby.code !== exclude &&
          lobby.players.some(
            (player) =>
              player.sessionToken === token && player.role !== 'spectator',
          ),
      )
  }

  private confirmSwitchFromCurrentGame(targetCode: string) {
    const previousLobby = this.currentActiveGameLobby(targetCode)

    if (!previousLobby) {
      return true
    }

    const confirmed = window.confirm(
      this.i18n.format('confirmSwitchGameWarning', {
        currentCode: previousLobby.code,
      }),
    )

    if (!confirmed) {
      return false
    }

    this.facade.leaveLobby(previousLobby.code)
    return true
  }

  private trimmedPassword(value: string) {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
  }

  enterFromLink() {
    if (!this.playerName.trim() || !this.routeCode) {
      this.appStore.setError(
        this.i18n.t('error.playerNameAndLobbyCodeRequired'),
      )
      return
    }

    const lobby = this.routeLobby()

    if (!lobby) {
      this.appStore.setError(this.i18n.t('error.lobbyNotFound'))
      return
    }

    if (!this.confirmSwitchFromCurrentGame(this.routeCode)) {
      return
    }

    if (lobby.hasPassword && !this.password.trim()) {
      this.appStore.setError(this.i18n.t('error.lobbyPasswordRequired'))
      return
    }

    const password = this.trimmedPassword(this.password)

    if (this.canReconnectLobby()) {
      this.facade.reconnectLobby(this.routeCode)
      return
    }

    if (this.isLobbyRunning(lobby.status)) {
      this.facade.spectateLobby(
        this.routeCode,
        this.playerName.trim(),
        password,
      )
      return
    }

    if (this.playingPlayersCount(lobby) >= 6) {
      this.appStore.setError(this.i18n.t('error.lobbyFull'))
      return
    }

    this.facade.joinLobby(this.routeCode, this.playerName.trim(), password)
  }

  refreshLobbies() {
    this.facade.listLobbies()
  }
}
