import { Component, OnDestroy, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { LobbySummary } from '@wizard/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationLanguage } from '../../core/i18n/translations'
import { GameFacadeService } from '../../core/services/game-facade.service'
import {
  type AppFontChoice,
  SessionService,
} from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'

const PLAYER_NAME_MAX_LENGTH = 15
const PLAYER_NAME_EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}\u200D\uFE0F]/u

@Component({
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="page-shell">
      <div class="panel grid">
        <div class="spread home-top-spread">
          <div>
            <h1 class="title">{{ 'homeTitle' | t }}</h1>
            <p class="subtitle">{{ 'homeSubtitle' | t }}</p>
          </div>

          <div class="home-preferences-row">
            <div class="home-language-box" style="min-width: 180px;">
              <label class="label">{{ 'language' | t }}</label>
              <select
                class="select"
                [ngModel]="language.language()"
                (ngModelChange)="setLanguage($event)"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div class="home-font-box" style="min-width: 220px;">
              <label class="label">{{ 'fontLabel' | t }}</label>
              <select
                class="select"
                [ngModel]="session.appFont()"
                (ngModelChange)="setAppFont($event)"
              >
                <option
                  value="simple"
                  style="font-family: 'Segoe UI', 'Noto Sans', 'Helvetica Neue', Arial, sans-serif;"
                >
                  {{ 'fontSimple' | t }}
                </option>
                <option
                  value="frances"
                  style="font-family: 'Frances Uncial Std', serif;"
                >
                  {{ 'fontFrances' | t }}
                </option>
              </select>
            </div>
          </div>
        </div>

        @if (store.error()) {
          <div class="error-box">{{ store.error() }}</div>
        }

        <div class="panel">
          <label class="label">{{ 'playerName' | t }}</label>
          <input
            class="input"
            [ngModel]="playerName"
            (ngModelChange)="onPlayerNameChange($event)"
            [attr.maxlength]="playerNameMaxLength"
          />
          @if (playerNameValidationErrorKey()) {
            <div class="error-box" style="margin-top: 8px;">
              {{ playerNameValidationErrorKey()! | t }}
            </div>
          }
        </div>

        <div class="grid home-actions-grid">
          <div class="panel">
            <h3 style="margin-top: 0;">{{ 'createLobby' | t }}</h3>

            <label class="label">{{ 'lobbyPasswordOptional' | t }}</label>
            <input class="input" [(ngModel)]="createPassword" type="password" />

            <div class="row create-lobby-actions" style="margin-top: 16px;">
              <button
                class="btn btn-primary"
                [disabled]="store.loading() || isPlayerNameInvalid()"
                (click)="createLobby()"
              >
                {{ 'createLobby' | t }}
              </button>
            </div>
          </div>

          <div class="panel">
            <h3 style="margin-top: 0;">{{ 'joinLobby' | t }}</h3>

            <label class="label">{{ 'lobbyCode' | t }}</label>
            <input class="input" [(ngModel)]="joinCode" />

            <label class="label" style="margin-top: 12px;">{{
              'lobbyPassword' | t
            }}</label>
            <input class="input" [(ngModel)]="joinPassword" type="password" />

            <div style="margin-top: 16px;" class="row">
              <button
                class="btn btn-primary"
                [disabled]="store.loading() || isPlayerNameInvalid()"
                (click)="joinLobby()"
              >
                {{ 'joinLobby' | t }}
              </button>

              @if (session.lastLobbyCode()) {
                <button
                  class="btn"
                  [disabled]="store.loading()"
                  (click)="reconnectLast()"
                >
                  {{ 'reconnect' | t }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="panel">
          <div style="margin-bottom: 12px;">
            <h3 style="margin: 0;">{{ 'lobbyListTitle' | t }}</h3>
          </div>

          @if (!store.lobbyList().length) {
            <div class="muted">{{ 'noLobbiesAvailable' | t }}</div>
          } @else {
            <div class="grid" style="gap: 10px;">
              @for (lobby of store.lobbyList(); track lobby.code) {
                <div class="panel" style="padding: 10px;">
                  <div class="spread" style="align-items: center;">
                    <div>
                      <div>
                        <strong>{{ lobby.code }}</strong>
                        @if (lobby.hasPassword) {
                          <span class="muted">
                            • {{ 'passwordProtected' | t }}</span
                          >
                        }
                        <span class="muted"> • </span
                        ><span
                          class="muted"
                          [style.color]="
                            isLobbyRunning(lobby.status)
                              ? 'var(--color-warning, #e6a817)'
                              : 'inherit'
                          "
                          >{{ statusLabel(lobby.status) }}</span
                        >
                      </div>
                      <div class="muted">
                        {{ 'players' | t }}: {{ playingPlayersCount(lobby) }}/6
                        • {{ 'spectators' | t }}: {{ spectatorsCount(lobby) }}
                      </div>
                    </div>

                    <div
                      class="row open-lobbies-actions"
                      style="align-items: center; gap: 8px;"
                    >
                      @if (lobby.hasPassword) {
                        <input
                          class="input open-lobbies-password-input"
                          [(ngModel)]="lobbyPasswords[lobby.code]"
                          type="password"
                          [placeholder]="'lobbyPasswordShort' | t"
                        />
                      }
                      @if (isLobbyRunning(lobby.status)) {
                        @if (canReconnectLobby(lobby)) {
                          <button
                            class="btn"
                            [disabled]="store.loading()"
                            (click)="reconnectListedLobby(lobby.code)"
                          >
                            {{ 'reconnect' | t }}
                          </button>
                        } @else {
                          <button
                            class="btn"
                            [disabled]="
                              store.loading() || isPlayerNameInvalid()
                            "
                            (click)="
                              spectateListedLobby(lobby.code, lobby.hasPassword)
                            "
                          >
                            {{ 'watchAsSpectator' | t }}
                          </button>
                        }
                      } @else {
                        <button
                          class="btn btn-primary"
                          [disabled]="store.loading() || isPlayerNameInvalid()"
                          (click)="
                            joinListedLobby(lobby.code, lobby.hasPassword)
                          "
                        >
                          {{ 'joinThisLobby' | t }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .title {
        font-family: 'Frances Uncial Std', serif;
        font-size: 3rem;
        margin: 20px 0;
        background: linear-gradient(
          to bottom,
          #ffffff 0%,
          #ffffff 30%,
          #d4a017 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }

      .home-actions-grid {
        grid-template-columns: 1fr 1fr;
      }

      .home-preferences-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }

      .open-lobbies-password-input {
        width: 150px;
      }

      @media (max-width: 900px) {
        .home-top-spread {
          flex-direction: column;
          align-items: flex-start;
        }

        .home-language-box {
          width: 100%;
          min-width: 0 !important;
        }

        .home-preferences-row {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .home-font-box {
          width: 100%;
          min-width: 0 !important;
        }

        .home-actions-grid {
          grid-template-columns: 1fr;
        }

        .open-lobbies-password-input {
          width: 100% !important;
          flex: 1 1 100%;
        }

        .open-lobbies-actions,
        .create-lobby-actions {
          width: 100%;
        }
      }
    `,
  ],
})
export class HomePageComponent implements OnInit, OnDestroy {
  readonly playerNameMaxLength = PLAYER_NAME_MAX_LENGTH
  playerName = this.session.playerName()
  joinCode = this.session.lastLobbyCode()
  createPassword = ''
  joinPassword = ''
  lobbyPasswords: Record<string, string> = {}
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null
  protected readonly store = this.appStore

  constructor(
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
    private readonly appStore: AppStore,
    protected readonly language: I18nService,
  ) {}

  setLanguage(language: TranslationLanguage) {
    this.language.setLanguage(language)
  }

  setAppFont(font: AppFontChoice) {
    this.session.setAppFont(font)
  }

  onPlayerNameChange(value: string) {
    this.playerName = value.slice(0, this.playerNameMaxLength)
  }

  playerNameValidationErrorKey() {
    const trimmedName = this.playerName.trim()

    if (!trimmedName) {
      return 'error.playerNameRequired' as const
    }

    if (trimmedName.length > this.playerNameMaxLength) {
      return 'error.playerNameTooLong' as const
    }

    if (PLAYER_NAME_EMOJI_PATTERN.test(trimmedName)) {
      return 'error.playerNameNoEmoji' as const
    }

    return null
  }

  isPlayerNameInvalid() {
    return this.playerNameValidationErrorKey() !== null
  }

  ngOnInit() {
    const invalidCode = (history.state as { invalidLobbyCode?: string })
      ?.invalidLobbyCode
    if (invalidCode) {
      this.appStore.setError(
        this.language.format('lobbyNotFoundRedirect', { code: invalidCode }),
      )
    }

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

  isLobbyRunning(status: string) {
    return status.trim().toLowerCase() === 'running'
  }

  statusLabel(status: string) {
    return this.isLobbyRunning(status)
      ? this.language.t('lobbyStatusRunning')
      : this.language.t('lobbyStatusWaiting')
  }

  playingPlayersCount(lobby: LobbySummary) {
    return lobby.players.filter((player) => player.role !== 'spectator').length
  }

  spectatorsCount(lobby: LobbySummary) {
    return lobby.players.filter((player) => player.role === 'spectator').length
  }

  canReconnectLobby(lobby: LobbySummary) {
    const token = this.session.sessionToken()

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

  private currentJoinedLobby() {
    const token = this.session.sessionToken()
    const currentLobby = this.store.lobby()

    if (currentLobby?.players.some((player) => player.sessionToken === token)) {
      return currentLobby
    }

    return this.store
      .lobbyList()
      .find((lobby) =>
        lobby.players.some((player) => player.sessionToken === token),
      )
  }

  private trimmedPassword(value: string) {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
  }

  private confirmSwitchFromCurrentGame(targetCode: string) {
    const previousLobby = this.currentActiveGameLobby(targetCode)

    if (!previousLobby) {
      return true
    }

    const confirmed = window.confirm(
      this.language.format('confirmSwitchGameWarning', {
        currentCode: previousLobby.code,
      }),
    )

    if (!confirmed) {
      return false
    }

    this.facade.leaveLobby(previousLobby.code)
    return true
  }

  createLobby() {
    const nameError = this.playerNameValidationErrorKey()
    if (nameError) {
      this.appStore.setError(this.language.t(nameError))
      return
    }

    const joinedLobby = this.currentJoinedLobby()

    if (joinedLobby) {
      this.appStore.setError(
        this.language.format('error.alreadyInLobbyCannotCreate', {
          code: joinedLobby.code,
        }),
      )
      return
    }

    this.facade.createLobby(
      this.playerName.trim(),
      undefined,
      this.trimmedPassword(this.createPassword),
    )
  }

  joinLobby() {
    const nameError = this.playerNameValidationErrorKey()
    if (nameError) {
      this.appStore.setError(this.language.t(nameError))
      return
    }

    if (!this.joinCode.trim()) {
      this.appStore.setError(
        this.language.t('error.playerNameAndLobbyCodeRequired'),
      )
      return
    }

    const code = this.joinCode.trim().toUpperCase()

    if (!this.confirmSwitchFromCurrentGame(code)) {
      return
    }

    this.facade.joinLobby(
      code,
      this.playerName.trim(),
      this.trimmedPassword(this.joinPassword),
    )
  }

  reconnectLast() {
    const code = this.session.lastLobbyCode()

    if (!code) {
      return
    }

    this.facade.reconnectLobby(code)
  }

  reconnectListedLobby(code: string) {
    this.facade.reconnectLobby(code)
  }

  spectateListedLobby(code: string, hasPassword: boolean) {
    const nameError = this.playerNameValidationErrorKey()
    if (nameError) {
      this.appStore.setError(this.language.t(nameError))
      return
    }

    if (!this.confirmSwitchFromCurrentGame(code)) {
      return
    }

    const password = this.lobbyPasswords[code]?.trim()
    if (hasPassword && !password) {
      this.appStore.setError(this.language.t('error.lobbyPasswordRequired'))
      return
    }

    this.facade.spectateLobby(
      code,
      this.playerName.trim(),
      password || undefined,
    )
  }

  joinListedLobby(code: string, hasPassword: boolean) {
    const nameError = this.playerNameValidationErrorKey()
    if (nameError) {
      this.appStore.setError(this.language.t(nameError))
      return
    }

    if (!this.confirmSwitchFromCurrentGame(code)) {
      return
    }

    const password = this.lobbyPasswords[code]?.trim()
    if (hasPassword && !password) {
      this.appStore.setError(this.language.t('error.lobbyPasswordRequired'))
      return
    }

    this.facade.joinLobby(code, this.playerName.trim(), password || undefined)
  }

  refreshLobbies() {
    this.facade.listLobbies()
  }
}
