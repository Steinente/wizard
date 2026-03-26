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
const LOBBY_REFRESH_INTERVAL_MS = 5000

@Component({
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
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

  private validatedPlayerName() {
    const nameError = this.playerNameValidationErrorKey()

    if (nameError) {
      this.appStore.setError(this.language.t(nameError))
      return null
    }

    return this.playerName.trim()
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
    }, LOBBY_REFRESH_INTERVAL_MS)
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
    const playerName = this.validatedPlayerName()
    if (!playerName) {
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
      playerName,
      undefined,
      this.trimmedPassword(this.createPassword),
    )
  }

  joinLobby() {
    const playerName = this.validatedPlayerName()
    if (!playerName) {
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
      playerName,
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
    const playerName = this.validatedPlayerName()
    if (!playerName) {
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

    this.facade.spectateLobby(code, playerName, password || undefined)
  }

  joinListedLobby(code: string, hasPassword: boolean) {
    const playerName = this.validatedPlayerName()
    if (!playerName) {
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

    this.facade.joinLobby(code, playerName, password || undefined)
  }

  refreshLobbies() {
    this.facade.listLobbies()
  }
}
