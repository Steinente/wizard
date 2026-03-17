import { Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationLanguage } from '../../core/i18n/translations'
import { GameFacadeService } from '../../core/services/game-facade.service'
import { SessionService } from '../../core/services/session.service'
import { AppStore } from '../../core/state/app.store'
import { TPipe } from '../../shared/pipes/t.pipe'

@Component({
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="page-shell">
      <div class="panel grid">
        <div class="spread">
          <div>
            <h1 class="title">{{ 'homeTitle' | t }}</h1>
            <p class="subtitle">{{ 'homeSubtitle' | t }}</p>
          </div>

          <div style="min-width: 180px;">
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
        </div>

        @if (store.error()) {
          <div class="error-box">{{ store.error() }}</div>
        }

        <div class="grid" style="grid-template-columns: 1fr 1fr;">
          <div class="panel">
            <label class="label">{{ 'playerName' | t }}</label>
            <input class="input" [(ngModel)]="playerName" />

            <div style="margin-top: 16px;">
              <button
                class="btn btn-primary"
                [disabled]="store.loading()"
                (click)="createLobby()"
              >
                {{ 'createLobby' | t }}
              </button>
            </div>
          </div>

          <div class="panel">
            <label class="label">{{ 'playerName' | t }}</label>
            <input class="input" [(ngModel)]="joinPlayerName" />

            <label class="label" style="margin-top: 12px;">{{
              'lobbyCode' | t
            }}</label>
            <input class="input" [(ngModel)]="joinCode" />

            <div style="margin-top: 16px;" class="row">
              <button
                class="btn btn-primary"
                [disabled]="store.loading()"
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
      </div>
    </div>
  `,
})
export class HomePageComponent {
  playerName = this.session.playerName()
  joinPlayerName = this.session.playerName()
  joinCode = this.session.lastLobbyCode()
  protected readonly store = this.appStore

  constructor(
    private readonly facade: GameFacadeService,
    protected readonly session: SessionService,
    private readonly appStore: AppStore,
    protected readonly language: I18nService,
    private readonly router: Router,
  ) {}

  setLanguage(language: TranslationLanguage) {
    this.language.setLanguage(language)
  }

  createLobby() {
    if (!this.playerName.trim()) {
      this.appStore.setError('Player name is required')
      return
    }

    this.facade.createLobby(this.playerName.trim())
  }

  joinLobby() {
    if (!this.joinPlayerName.trim() || !this.joinCode.trim()) {
      this.appStore.setError('Player name and lobby code are required')
      return
    }

    const code = this.joinCode.trim().toUpperCase()

    this.facade.joinLobby(code, this.joinPlayerName.trim())
    this.router.navigateByUrl(`/lobby/${code}`)
  }

  reconnectLast() {
    const code = this.session.lastLobbyCode()

    if (!code) {
      return
    }

    this.facade.reconnectLobby(code)
  }
}
