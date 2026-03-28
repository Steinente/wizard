import { Component, HostListener, Input, signal } from '@angular/core'
import { TPipe } from '../../../shared/pipes/t.pipe'

export type CombinationHintBlockView = {
  key: string
  html: string
}

@Component({
  standalone: true,
  selector: 'wiz-combination-hints-popup',
  imports: [TPipe],
  templateUrl: './combination-hints-popup.component.html',
  styleUrl: './combination-hints-popup.component.css',
})
export class CombinationHintsPopupComponent {
  @Input({ required: true }) hasActiveHints = false
  @Input({ required: true }) hintBlocks: CombinationHintBlockView[] = []
  @Input({ required: true }) hintCount = 0
  @Input({ required: true }) loading = false

  readonly popupOpen = signal(false)

  togglePopup() {
    this.popupOpen.update((isOpen) => !isOpen)
  }

  closePopup() {
    this.popupOpen.set(false)
  }

  @HostListener('document:keydown.escape')
  onEscapeKeyDown() {
    if (this.popupOpen()) {
      this.closePopup()
    }
  }
}
