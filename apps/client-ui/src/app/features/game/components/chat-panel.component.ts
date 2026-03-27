import { DatePipe } from '@angular/common'
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  ViewChild,
  inject,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import type { GameChatMessageView } from '@wizard/shared'
import { TPipe } from '../../../shared/pipes/t.pipe'

const QUICK_EMOTES = ['😀', '🎉', '👏', '😅', '🤔', '❤️']

@Component({
  selector: 'wiz-chat-panel',
  standalone: true,
  imports: [FormsModule, TPipe, DatePipe],
  template: `
    <div #panelRoot class="panel chat-panel">
      <div class="chat-header">
        <h3 style="margin: 0;">{{ 'chat' | t }}</h3>
        <div class="chat-header-actions">
          @if (canToggleSpectatorChat) {
            <button
              class="btn spectator-chat-btn"
              [class.btn-active]="spectatorChatAllowed"
              type="button"
              [title]="
                (spectatorChatAllowed
                  ? 'spectatorChatEnabled'
                  : 'spectatorChatDisabled'
                ) | t
              "
              (click)="toggleSpectatorChat()"
            >
              {{ spectatorChatAllowed ? '👥' : '🚫👥' }}
            </button>
          }

          <button
            class="btn chat-sound-btn"
            [class.btn-active]="chatSoundEnabled"
            type="button"
            [title]="
              (chatSoundEnabled ? 'chatSoundEnabled' : 'chatSoundDisabled') | t
            "
            (click)="toggleChatSound()"
          >
            {{ chatSoundEnabled ? '🔔' : '🔕' }}
          </button>
        </div>
      </div>

      <div
        #scrollContainer
        class="chat-messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        (scroll)="onScroll()"
      >
        @if (!messages.length) {
          <div class="muted">{{ 'chatNoMessages' | t }}</div>
        } @else {
          @for (message of messages; track message.id) {
            <div
              class="chat-message"
              [class.is-system]="isSystemMessage(message)"
              [class.is-own]="message.senderPlayerId === selfPlayerId"
            >
              <div class="chat-meta muted">
                <span class="chat-name">{{ message.senderName }}</span>
                @if (!isSystemMessage(message)) {
                  <span class="chat-role">{{
                    roleLabel(message.senderRole) | t
                  }}</span>
                }
                <span>•</span>
                <span>{{ message.createdAt | date: 'HH:mm:ss' }}</span>
              </div>
              <div class="chat-text">{{ renderMessageText(message) }}</div>
            </div>
          }
        }
      </div>

      <div class="chat-emotes">
        <span class="muted">{{ 'chatEmotesLabel' | t }}:</span>
        @for (emote of quickEmotes; track emote) {
          <button
            class="btn emote-btn"
            type="button"
            [disabled]="!canSendMessage()"
            (click)="appendEmote(emote)"
          >
            {{ emote }}
          </button>
        }
      </div>

      <div class="chat-input-row">
        <input
          id="chat-message-input"
          name="chatMessage"
          class="input"
          type="text"
          [disabled]="!canSendMessage()"
          [ngModel]="draft"
          (ngModelChange)="draft = $event"
          [placeholder]="
            (canSendMessage()
              ? 'chatInputPlaceholder'
              : 'chatInputDisabledForSpectator'
            ) | t
          "
          maxlength="300"
          (keydown.enter)="send()"
        />
        <button
          class="btn"
          type="button"
          [disabled]="!canSendMessage()"
          (click)="send()"
        >
          {{ 'chatSend' | t }}
        </button>
      </div>

      <div
        class="chat-resize-handle"
        role="presentation"
        aria-hidden="true"
        (mousedown)="startResize($event)"
      ></div>
    </div>
  `,
  styles: [
    `
      .chat-panel {
        display: flex;
        flex-direction: column;
        position: relative;
        gap: 10px;
        height: 320px;
        min-height: 260px;
        max-height: 75vh;
        overflow: hidden;
      }

      .chat-resize-handle {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 10px;
        cursor: ns-resize;
        background: transparent;
        z-index: 2;
      }

      .chat-messages {
        display: grid;
        align-content: start;
        grid-auto-rows: max-content;
        gap: 8px;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-right: 4px;
        padding-bottom: 8px;
      }

      .chat-message {
        padding: 8px;
        border-radius: 10px;
        background: rgba(148, 163, 184, 0.12);
      }

      .chat-message.is-own {
        background: rgba(59, 130, 246, 0.16);
      }

      .chat-message.is-system {
        background: rgba(226, 232, 240, 0.08);
        border: 1px solid rgba(226, 232, 240, 0.12);
      }

      .chat-meta {
        display: flex;
        gap: 6px;
        font-size: 11px;
        align-items: center;
        margin-bottom: 2px;
      }

      .chat-name {
        font-weight: 700;
        color: #e2e8f0;
      }

      .chat-message.is-system .chat-name {
        color: #f8fafc;
      }

      .chat-role {
        font-weight: 600;
      }

      .chat-text {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 13px;
      }

      .chat-emotes {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      .emote-btn {
        padding: 4px 8px;
        border-radius: 8px;
        min-width: 36px;
      }

      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .chat-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .chat-sound-btn {
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1;
        flex-shrink: 0;
      }

      .spectator-chat-btn {
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1;
        flex-shrink: 0;
      }

      .spectator-chat-btn.btn-active {
        background: #22304a;
        color: var(--text);
        border-color: var(--border);
      }

      .chat-sound-btn.btn-active {
        background: #22304a;
        color: var(--text);
        border-color: var(--border);
      }

      .chat-input-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
      }

      @media (max-width: 700px) {
        .chat-panel {
          height: auto;
          min-height: 0;
          max-height: none;
        }

        .chat-resize-handle {
          display: none;
        }

        .chat-messages {
          flex: none;
          max-height: 220px;
        }
      }
    `,
  ],
})
export class ChatPanelComponent implements OnChanges {
  @ViewChild('panelRoot')
  private panelRoot?: ElementRef<HTMLElement>

  @ViewChild('scrollContainer')
  private scrollContainer?: ElementRef<HTMLElement>

  @Input({ required: true }) messages: GameChatMessageView[] = []
  @Input({ required: true }) selfPlayerId = ''
  @Output() readonly sendMessage = new EventEmitter<string>()
  @Input() selfRole: 'host' | 'player' | 'spectator' = 'player'
  @Input() spectatorChatAllowed = true
  @Input() canToggleSpectatorChat = false
  @Output() readonly spectatorChatToggle = new EventEmitter<boolean>()
  @Input() chatSoundEnabled = true
  @Output() readonly chatSoundToggle = new EventEmitter<boolean>()

  draft = ''
  readonly quickEmotes = QUICK_EMOTES
  private isAtBottom = true
  private isResizing = false
  private readonly i18n = inject(I18nService)
  private resizeStartPageY = 0
  private resizeStartHeight = 0
  private lastPointerClientY = 0
  private autoScrollRafId: number | null = null

  startResize(event: MouseEvent) {
    if (typeof window === 'undefined' || window.innerWidth <= 700) {
      return
    }

    const panel = this.panelRoot?.nativeElement

    if (!panel) {
      return
    }

    event.preventDefault()
    this.isResizing = true
    this.resizeStartPageY = event.pageY
    this.resizeStartHeight = panel.getBoundingClientRect().height
    this.lastPointerClientY = event.clientY
    document.body.style.userSelect = 'none'
    this.ensureAutoScrollLoop()
  }

  @HostListener('document:mousemove', ['$event'])
  onResizeMove(event: MouseEvent) {
    if (!this.isResizing) {
      return
    }

    this.lastPointerClientY = event.clientY
    this.applyResizeFromPageY(event.pageY)
  }

  private applyResizeFromPageY(pointerPageY: number) {
    const panel = this.panelRoot?.nativeElement

    if (!panel) {
      return
    }

    const deltaY = pointerPageY - this.resizeStartPageY
    const minHeight = 260
    const maxHeight = Math.floor(window.innerHeight * 0.75)
    const nextHeight = Math.min(
      maxHeight,
      Math.max(minHeight, this.resizeStartHeight + deltaY),
    )

    panel.style.height = `${nextHeight}px`
  }

  private ensureAutoScrollLoop() {
    if (this.autoScrollRafId !== null) {
      return
    }

    const step = () => {
      if (!this.isResizing) {
        this.autoScrollRafId = null
        return
      }

      const edge = 8
      const speed = 0.5

      if (this.lastPointerClientY >= window.innerHeight - edge) {
        window.scrollBy(0, speed)
      }

      const pointerPageY = this.lastPointerClientY + window.scrollY
      this.applyResizeFromPageY(pointerPageY)

      this.autoScrollRafId = window.requestAnimationFrame(step)
    }

    this.autoScrollRafId = window.requestAnimationFrame(step)
  }

  @HostListener('document:mouseup')
  stopResize() {
    if (!this.isResizing) {
      return
    }

    this.isResizing = false
    if (this.autoScrollRafId !== null) {
      window.cancelAnimationFrame(this.autoScrollRafId)
      this.autoScrollRafId = null
    }
    document.body.style.removeProperty('user-select')
  }

  onScroll() {
    const el = this.scrollContainer?.nativeElement

    if (!el) {
      return
    }

    const threshold = 8
    this.isAtBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  ngOnChanges() {
    if (!this.isAtBottom) {
      return
    }

    requestAnimationFrame(() => {
      const el = this.scrollContainer?.nativeElement

      if (el) {
        el.scrollTop = el.scrollHeight
      }
    })
  }

  roleLabel(role: GameChatMessageView['senderRole']) {
    return `role.${role}` as TranslationKey
  }

  isSystemMessage(message: GameChatMessageView) {
    return (message.senderRole as string) === 'system'
  }

  renderMessageText(message: GameChatMessageView) {
    if (!message.systemMessageKey) {
      return message.text
    }

    return this.i18n.format(
      message.systemMessageKey as TranslationKey,
      message.systemMessageParams,
    )
  }

  toggleChatSound() {
    this.chatSoundToggle.emit(!this.chatSoundEnabled)
  }

  toggleSpectatorChat() {
    this.spectatorChatToggle.emit(!this.spectatorChatAllowed)
  }

  canSendMessage() {
    return this.selfRole !== 'spectator' || this.spectatorChatAllowed
  }

  appendEmote(emote: string) {
    if (!this.canSendMessage()) {
      return
    }

    const prefix = this.draft.trim().length ? ' ' : ''
    this.draft = `${this.draft}${prefix}${emote}`.slice(0, 300)
  }

  send() {
    if (!this.canSendMessage()) {
      return
    }

    const text = this.draft.trim()

    if (!text.length) {
      return
    }

    this.sendMessage.emit(text)
    this.draft = ''
  }
}
