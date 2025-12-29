import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorsService } from '../../core/api/doctors.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatFormFieldModule, MatSelectModule, MatProgressBarModule],
  template: `
  <div class="page">
    <mat-card class="card">
      <mat-card-title>Listado de médicos SaludPlus</mat-card-title>
      <mat-card-content>
        <mat-form-field appearance="outline" style="width:320px; margin-top:12px;">
          <mat-label>Especialidad</mat-label>
          <mat-select [value]="specialty()" (selectionChange)="setSpecialty($event.value)">
            <mat-option value="">Todas</mat-option>
            <mat-option *ngFor="let s of specialties()" [value]="s">{{s}}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px; margin-top:12px;">
          <mat-card *ngFor="let d of doctors()">
            <mat-card-title style="font-size:16px;">{{d.nombre}}</mat-card-title>
            <mat-card-subtitle>{{d.especialidad}}</mat-card-subtitle>
            <mat-card-content>
              <mat-chip-set>
                <mat-chip color="primary" selected>{{d.activo ? 'Activo' : 'Inactivo'}}</mat-chip>
              </mat-chip-set>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-card-content>
    </mat-card>
  </div>
  `
})
export class MedicosPage {
  doctors = signal<any[]>([]);
  loading = signal(false);
  specialty = signal<string>('');

  specialties = computed(() => {
    const set = new Set(this.doctors().map(d => d.especialidad));
    return Array.from(set).sort();
  });

  constructor(private doctorsApi: DoctorsService) {
    this.refresh();
  }

  setSpecialty(v: string) {
    this.specialty.set(v || '');
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.doctorsApi.list(this.specialty() || undefined).subscribe({
      next: rows => { this.doctors.set(rows); this.loading.set(false); },
      error: _ => this.loading.set(false)
    });
  }
}
