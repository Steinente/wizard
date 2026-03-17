import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AppInitService } from './core/services/app-init.service'

@Component({
  selector: 'wiz-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {
  constructor(private readonly appInit: AppInitService) {
    this.appInit.init()
  }
}
