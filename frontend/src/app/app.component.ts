import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatSidenavModule, MatListModule
  ],
  template: `
  <mat-sidenav-container style="height:100vh">
    <mat-sidenav #snav mode="over">
      <mat-nav-list>
        <a mat-list-item routerLink="/agenda" (click)="snav.close()">Agenda</a>
        <a mat-list-item routerLink="/citas" (click)="snav.close()">Citas</a>
        <a mat-list-item routerLink="/medicos" (click)="snav.close()">Médicos</a>
      </mat-nav-list>
    </mat-sidenav>

    <mat-sidenav-content>
      <mat-toolbar color="primary">
        <button mat-icon-button (click)="snav.toggle()" aria-label="menu">
          <mat-icon>menu</mat-icon>
        </button>
        <span class="toolbar-title">SaludPlus</span>
        <span style="flex:1 1 auto"></span>
        <a mat-button routerLink="/agenda" routerLinkActive="active">Agenda</a>
        <a mat-button routerLink="/citas" routerLinkActive="active">Citas</a>
        <a mat-button routerLink="/medicos" routerLinkActive="active">Médicos</a>
      </mat-toolbar>

      <router-outlet></router-outlet>
    </mat-sidenav-content>
  </mat-sidenav-container>
  `
})
export class AppComponent {}
