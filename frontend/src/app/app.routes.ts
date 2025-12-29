import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'agenda' },
  { path: 'medicos', loadComponent: () => import('./modules/medicos/medicos.page').then(m => m.MedicosPage) },
  { path: 'citas', loadComponent: () => import('./modules/citas/citas.page').then(m => m.CitasPage) },
  { path: 'agenda', loadComponent: () => import('./modules/agenda/agenda.page').then(m => m.AgendaPage) },
  { path: '**', redirectTo: 'agenda' },
];
