import { Component } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { RouterOutlet } from '@angular/router'
import { AppInitService } from './core/services/app-init.service'
import { SiteFooterComponent } from './site-footer.component'

@Component({
  selector: 'wiz-root',
  standalone: true,
  imports: [RouterOutlet, NgComponentOutlet],
  template: `
    <div class="app-shell">
      <main class="app-main">
        <router-outlet />
      </main>

      <ng-container *ngComponentOutlet="siteFooterComponent" />
    </div>
  `,
})
export class AppComponent {
  protected readonly siteFooterComponent = SiteFooterComponent

  constructor(private readonly appInit: AppInitService) {
    this.appInit.init()
  }
}
