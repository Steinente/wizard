import { Component, ElementRef, HostListener, signal } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { AppStore } from './core/state/app.store'
import { TPipe } from './shared/pipes/t.pipe'

@Component({
  selector: 'wiz-site-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TPipe],
  template: `
    <footer class="site-legal" [attr.aria-label]="'legalFooterLabel' | t">
      <div class="site-legal-inner">
        <div class="site-legal-links">
          <a
            routerLink="/imprint"
            routerLinkActive="site-legal-link-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="site-legal-link"
            (click)="clearTransientMessages()"
          >
            {{ 'legalImprintTitle' | t }}
          </a>

          <a
            routerLink="/privacy"
            routerLinkActive="site-legal-link-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="site-legal-link"
            (click)="clearTransientMessages()"
          >
            {{ 'legalPrivacyTitle' | t }}
          </a>
        </div>

        <div class="site-donate">
          @if (donationOpen()) {
            <div class="site-donate-popover">
              <p class="site-donate-text">{{ 'donationPopoverText' | t }}</p>
              <a
                href="https://paypal.me/steinente"
                target="_blank"
                rel="noreferrer noopener"
                class="site-donate-link"
              >
                {{ 'donationLinkLabel' | t }}
              </a>
            </div>
          }

          <button
            type="button"
            class="site-donate-trigger"
            [attr.aria-expanded]="donationOpen()"
            [attr.aria-label]="'donationButtonLabel' | t"
            (click)="toggleDonation()"
          >
            <img
              src="/icons/paypal-logo.svg"
              alt=""
              aria-hidden="true"
              class="site-donate-logo"
            />
            <span class="site-donate-trigger-text">PayPal</span>
          </button>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .site-legal {
        flex: 0 0 auto;
        padding: 0 16px 18px;
      }

      .site-legal-inner {
        max-width: 1440px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px 24px;
      }

      .site-legal-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px 18px;
        flex-wrap: wrap;
        grid-column: 2;
      }

      .site-legal-link {
        text-decoration: none;
        color: rgb(159 176 201 / 0.82);
        font-size: 12px;
        line-height: 1.4;
        transition:
          color 160ms ease,
          opacity 160ms ease,
          border-color 160ms ease;
        border-bottom: 1px solid transparent;
      }

      .site-legal-link:hover,
      .site-legal-link-active {
        color: var(--text);
        border-color: rgb(229 238 252 / 0.35);
      }

      .site-donate {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        grid-column: 3;
        justify-self: end;
      }

      .site-donate-trigger {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 42px;
        padding: 8px 14px 8px 10px;
        border: 1px solid rgb(109 145 198 / 0.24);
        border-radius: 999px;
        background:
          linear-gradient(135deg, rgb(14 38 74 / 0.96), rgb(28 92 182 / 0.85)),
          linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent);
        color: #eff6ff;
        box-shadow: 0 10px 30px rgb(0 0 0 / 0.18);
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease,
          filter 180ms ease;
      }

      .site-donate-trigger:focus-visible {
        outline: 2px solid rgb(255 221 115 / 0.9);
        outline-offset: 3px;
      }

      .site-donate-trigger:hover {
        transform: translateY(-1px);
        border-color: rgb(160 198 255 / 0.45);
        box-shadow: 0 14px 34px rgb(0 0 0 / 0.24);
        filter: saturate(1.08);
      }

      .site-donate-logo {
        display: block;
        width: auto;
        height: 20px;
        max-width: 72px;
        filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.24));
      }

      .site-donate-trigger-text {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .site-donate-popover {
        position: absolute;
        right: 0;
        bottom: calc(100% + 12px);
        width: min(340px, calc(100vw - 24px));
        padding: 14px;
        border: 1px solid rgb(84 136 214 / 0.34);
        border-radius: 16px;
        background: linear-gradient(
          180deg,
          rgb(13 24 42 / 0.97),
          rgb(18 39 73 / 0.96)
        );
        box-shadow: 0 22px 48px rgb(0 0 0 / 0.28);
        backdrop-filter: blur(12px);
        z-index: 1002;
      }

      .site-donate-popover::after {
        content: '';
        position: absolute;
        right: 22px;
        top: 100%;
        width: 14px;
        height: 14px;
        background: rgb(18 39 73 / 0.96);
        border-right: 1px solid rgb(84 136 214 / 0.34);
        border-bottom: 1px solid rgb(84 136 214 / 0.34);
        transform: translateY(-7px) rotate(45deg);
      }

      .site-donate-text {
        margin: 0;
        color: rgb(229 238 252 / 0.94);
        font-size: 13px;
        line-height: 1.5;
      }

      .site-donate-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 12px;
        padding: 9px 14px;
        border-radius: 999px;
        background: linear-gradient(135deg, #f6c44b, #ffdd73);
        color: #14213d;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.45);
      }

      .site-donate-link:hover {
        filter: brightness(1.04);
      }

      @media (max-width: 900px) {
        .site-legal {
          padding: 0 10px 16px;
        }
      }

      @media (max-width: 480px) {
        .site-legal {
          padding: 0 8px 14px;
        }

        .site-legal-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: nowrap;
          gap: 10px;
        }

        .site-legal-links,
        .site-donate {
          width: auto;
          grid-column: auto;
        }

        .site-legal-links {
          justify-content: flex-start;
          flex-wrap: nowrap;
          gap: 8px 12px;
        }

        .site-donate {
          justify-content: flex-end;
          flex: 0 0 auto;
        }

        .site-donate-popover {
          left: auto;
          right: 0;
        }

        .site-donate-popover::after {
          left: auto;
          right: 22px;
        }

        .site-legal-link {
          width: auto;
          white-space: nowrap;
        }
      }
    `,
  ],
})
export class SiteFooterComponent {
  protected readonly donationOpen = signal(false)

  constructor(
    private readonly appStore: AppStore,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

  @HostListener('document:pointerdown', ['$event'])
  handleDocumentPointerDown(event: PointerEvent) {
    if (!this.donationOpen()) {
      return
    }

    const eventTarget = event.target
    if (!(eventTarget instanceof Node)) {
      return
    }

    if (!this.elementRef.nativeElement.contains(eventTarget)) {
      this.donationOpen.set(false)
    }
  }

  @HostListener('window:scroll')
  handleWindowScroll() {
    if (this.donationOpen()) {
      this.donationOpen.set(false)
    }
  }

  @HostListener('document:touchmove')
  handleDocumentTouchMove() {
    if (this.donationOpen()) {
      this.donationOpen.set(false)
    }
  }

  clearTransientMessages() {
    this.appStore.setError(null)
  }

  toggleDonation() {
    this.donationOpen.update((currentValue) => !currentValue)
  }
}
