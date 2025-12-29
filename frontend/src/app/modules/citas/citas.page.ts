import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { DoctorsService } from '../../core/api/doctors.service';
import { AppointmentsService } from '../../core/api/appointments.service';

function toYmd(d: Date) {
  const pad = (n:number)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

@Component({
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatDatepickerModule, MatNativeDateModule, MatSnackBarModule, MatChipsModule
  ],
  template: `
  <div class="page">
    <mat-card class="card">
      <mat-card-title>Registrar cita</mat-card-title>
      <mat-card-content>
        <form [formGroup]="form" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:12px; margin-top:12px;">
          <mat-form-field appearance="outline">
            <mat-label>Paciente</mat-label>
            <input matInput formControlName="pacienteNombre" placeholder="Nombre del paciente">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Médico</mat-label>
            <mat-select formControlName="medicoId">
              <mat-option *ngFor="let d of doctors()" [value]="d.id">{{d.nombre}} — {{d.especialidad}}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="fecha">
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora (HH:MM)</mat-label>
            <input matInput formControlName="hora" placeholder="09:00">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="CONFIRMADA">Confirmada</mat-option>
              <mat-option value="REALIZADA">Realizada</mat-option>
              <mat-option value="CANCELADA">Cancelada</mat-option>
            </mat-select>
          </mat-form-field>

          <div style="display:flex; gap:12px; align-items:center;">
            <button mat-raised-button color="primary" (click)="crear()" type="button">Guardar</button>
            <button mat-button (click)="form.reset(defaults)" type="button">Limpiar</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <mat-card class="card" style="margin-top:16px;">
      <mat-card-title>Historial / búsqueda</mat-card-title>
      <mat-card-content>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:12px; margin-top:12px;">
          <mat-form-field appearance="outline">
            <mat-label>Buscar paciente</mat-label>
            <input matInput [value]="filters().patient" (input)="setFilter('patient',$any($event.target).value)">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Filtrar por médico</mat-label>
            <mat-select [value]="filters().doctorId" (selectionChange)="setFilter('doctorId',$event.value)">
              <mat-option value="">Todos</mat-option>
              <mat-option *ngFor="let d of doctors()" [value]="d.id">{{d.nombre}}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select [value]="filters().status" (selectionChange)="setFilter('status',$event.value)">
              <mat-option value="">Todos</mat-option>
              <mat-option value="CONFIRMADA">Confirmada</mat-option>
              <mat-option value="REALIZADA">Realizada</mat-option>
              <mat-option value="CANCELADA">Cancelada</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Especialidad</mat-label>
            <mat-select [value]="filters().specialty" (selectionChange)="setFilter('specialty',$event.value)">
              <mat-option value="">Todas</mat-option>
              <mat-option *ngFor="let s of specialties()" [value]="s">{{s}}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput [matDatepicker]="p1" (dateChange)="setRange('from',$event.value)" />
            <mat-datepicker #p1></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput [matDatepicker]="p2" (dateChange)="setRange('to',$event.value)" />
            <mat-datepicker #p2></mat-datepicker>
          </mat-form-field>

          <div style="display:flex; gap:12px; align-items:center;">
            <button mat-raised-button (click)="refresh()">Actualizar</button>
          </div>
        </div>

        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <mat-chip color="primary" selected>Citas: {{rows().length}}</mat-chip>
          <mat-chip selected>Semana: {{weekCount()}}</mat-chip>
          <mat-chip selected>Mes: {{monthCount()}}</mat-chip>
        </div>

        <table mat-table [dataSource]="rows()" style="width:100%; margin-top:12px;">
          <ng-container matColumnDef="inicio">
            <th mat-header-cell *matHeaderCellDef>Fecha/Hora</th>
            <td mat-cell *matCellDef="let r">{{r.inicio | date:'yyyy-MM-dd HH:mm'}}</td>
          </ng-container>

          <ng-container matColumnDef="paciente">
            <th mat-header-cell *matHeaderCellDef>Paciente</th>
            <td mat-cell *matCellDef="let r">{{r.pacienteNombre}}</td>
          </ng-container>

          <ng-container matColumnDef="medico">
            <th mat-header-cell *matHeaderCellDef>Médico</th>
            <td mat-cell *matCellDef="let r">
              {{r.medicoNombre}}<div style="font-size:12px; opacity:.7">{{r.especialidad}}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">
              <mat-chip [color]="chipColor(r.estado)" selected>{{r.estado}}</mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              <button mat-button (click)="setEstado(r.id,'CONFIRMADA')">Confirmar</button>
              <button mat-button (click)="setEstado(r.id,'REALIZADA')">Realizar</button>
              <button mat-button color="warn" (click)="setEstado(r.id,'CANCELADA')">Cancelar</button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </mat-card-content>
    </mat-card>
  </div>
  `
})
export class CitasPage {
  cols = ['inicio','paciente','medico','estado','acciones'];

  doctors = signal<any[]>([]);
  rows = signal<any[]>([]);
  filters = signal<any>({ patient:'', doctorId:'', status:'', specialty:'', from:'', to:'' });

  specialties = computed(() => {
    const set = new Set(this.doctors().map(d => d.especialidad));
    return Array.from(set).sort();
  });

  defaults = {
    pacienteNombre: '',
    medicoId: '',
    fecha: new Date(),
    hora: '09:00',
    estado: 'CONFIRMADA'
  };

  form = this.fb.group({
    pacienteNombre: [this.defaults.pacienteNombre],
    medicoId: [this.defaults.medicoId],
    fecha: [this.defaults.fecha],
    hora: [this.defaults.hora],
    estado: [this.defaults.estado],
  });

  constructor(
    private fb: FormBuilder,
    private doctorsApi: DoctorsService,
    private apptApi: AppointmentsService,
    private snack: MatSnackBar
  ) {
    this.doctorsApi.list().subscribe(d => this.doctors.set(d));
    this.refresh();
  }

  chipColor(s: string) {
    if (s === 'CONFIRMADA') return 'primary';
    if (s === 'REALIZADA') return 'accent';
    return undefined;
  }

  setFilter(k: string, v: any) {
    this.filters.set({ ...this.filters(), [k]: v || '' });
    this.refresh();
  }

  setRange(k: 'from'|'to', d: Date|null) {
    const v = d ? toYmd(d) : '';
    this.filters.set({ ...this.filters(), [k]: v ? (k==='to' ? `${v}T23:59:59Z` : `${v}T00:00:00Z`) : '' });
    this.refresh();
  }

  refresh() {
    this.apptApi.list(this.filters()).subscribe(r => this.rows.set(r));
  }

  async crear() {
    const v = this.form.getRawValue();
    if (!v.pacienteNombre || !v.medicoId || !v.fecha || !v.hora) {
      this.snack.open('Completa paciente, médico, fecha y hora', 'OK', { duration: 2500 });
      return;
    }
    const [hh, mm] = String(v.hora).split(':').map(n => Number(n));
    const dt = new Date(v.fecha);
    dt.setHours(hh||0, mm||0, 0, 0);

    this.apptApi.create({
      pacienteNombre: v.pacienteNombre!,
      medicoId: v.medicoId!,
      inicio: dt.toISOString(),
      estado: v.estado as any
    }).subscribe({
      next: _ => {
        this.snack.open('Cita registrada', 'OK', { duration: 2000 });
        this.refresh();
      },
      error: err => {
        if (err?.status === 409) this.snack.open('Esa hora ya está reservada para ese médico', 'OK', { duration: 3500 });
        else this.snack.open('Error al guardar', 'OK', { duration: 2500 });
      }
    });
  }

  setEstado(id: string, estado: string) {
    this.apptApi.patch(id, { estado }).subscribe({
      next: _ => this.refresh(),
      error: _ => this.snack.open('No se pudo actualizar', 'OK', { duration: 2500 })
    });
  }

  // counts for current week/month based on loaded rows
  weekCount() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay()+6)%7)); // Monday
    start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate()+7);
    return this.rows().filter(r => {
      const t = new Date(r.inicio).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
  }

  monthCount() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth()+1, 1);
    return this.rows().filter(r => {
      const t = new Date(r.inicio).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
  }
}
