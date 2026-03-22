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
} from '@angular/core'
import { FormsModule } from '@angular/forms'
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
              [class.is-own]="message.senderPlayerId === selfPlayerId"
            >
              <div class="chat-meta muted">
                <span class="chat-name">{{ message.senderName }}</span>
                <span class="chat-role">{{
                  roleLabel(message.senderRole) | t
                }}</span>
                <span>•</span>
                <span>{{ message.createdAt | date: 'HH:mm:ss' }}</span>
              </div>
              <div class="chat-text">{{ message.text }}</div>
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
          [ngModel]="draft"
          (ngModelChange)="draft = $event"
          [placeholder]="'chatInputPlaceholder' | t"
          maxlength="300"
          (keydown.enter)="send()"
        />
        <button class="btn" type="button" (click)="send()">
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

      .chat-sound-btn {
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1;
        flex-shrink: 0;
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
  @Input() chatSoundEnabled = true
  @Output() readonly chatSoundToggle = new EventEmitter<boolean>()

  draft = ''
  readonly quickEmotes = QUICK_EMOTES
  private isAtBottom = true
  private isResizing = false
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
    return `role_${role}` as TranslationKey
  }

  toggleChatSound() {
    this.chatSoundToggle.emit(!this.chatSoundEnabled)
  }

  appendEmote(emote: string) {
    const prefix = this.draft.trim().length ? ' ' : ''
    this.draft = `${this.draft}${prefix}${emote}`.slice(0, 300)
  }

  send() {
    const text = this.draft.trim()

    if (!text.length) {
      return
    }

    this.sendMessage.emit(text)
    this.draft = ''
  }
}
