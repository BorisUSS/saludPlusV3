import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { DoctorsService } from '../../core/api/doctors.service';
import { AppointmentsService } from '../../core/api/appointments.service';

function pad(n:number){ return String(n).padStart(2,'0'); }
function ymd(d: Date){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatSnackBarModule, MatChipsModule, MatDatepickerModule, MatNativeDateModule],
  template: `
  <div class="page">
    <mat-card class="card">
      <mat-card-title>Agenda (semanal)</mat-card-title>
      <mat-card-content>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:12px; margin-top:12px;">
          <mat-form-field appearance="outline">
            <mat-label>Médico</mat-label>
            <mat-select [value]="doctorId()" (selectionChange)="doctorId.set($event.value)">
              <mat-option *ngFor="let d of doctors()" [value]="d.id">{{d.nombre}} — {{d.especialidad}}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Semana (fecha)</mat-label>
            <input matInput [matDatepicker]="p" [value]="weekDate()" (dateChange)="setWeek($event.value)">
            <mat-datepicker #p></mat-datepicker>
          </mat-form-field>

          <div style="display:flex; gap:12px; align-items:center;">
            <button mat-raised-button (click)="prevWeek()">Semana -1</button>
            <button mat-raised-button (click)="nextWeek()">Semana +1</button>
          </div>
        </div>

        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <mat-chip color="primary" selected>Slot: {{slotMinutes()}} min</mat-chip>
          <mat-chip selected>Reservadas semana: {{reservedCount()}}</mat-chip>
        </div>

        <div style="overflow:auto; margin-top:12px;">
          <table style="width:100%; border-collapse:collapse; min-width:900px; background:#fff; border-radius:12px; overflow:hidden;">
            <thead>
              <tr style="background:#eef2ff;">
                <th style="text-align:left; padding:10px; width:90px;">Hora</th>
                <th *ngFor="let d of weekDays()" style="text-align:left; padding:10px;">
                  {{d | date:'EEE dd/MM'}}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of hours()">
                <td style="padding:10px; border-top:1px solid #eee; font-weight:600;">{{h}}</td>
                <td *ngFor="let d of weekDays()" style="padding:8px; border-top:1px solid #eee;">
                  <button mat-stroked-button style="width:100%; justify-content:flex-start"
                    [disabled]="isOccupied(d,h)"
                    (click)="reserve(d,h)">
                    <span *ngIf="isOccupied(d,h)">Reservada</span>
                    <span *ngIf="!isOccupied(d,h)">Disponible</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  </div>
  `
})
export class AgendaPage {
  doctors = signal<any[]>([]);
  doctorId = signal<string>('');
  weekDate = signal<Date>(new Date());

  slotMinutes = signal<number>(30);
  occupied = signal<Record<string, boolean>>({}); // key: YYYY-MM-DDTHH:MM

  weekDays = computed(() => {
    const d = new Date(this.weekDate());
    // move to monday
    const day = (d.getDay()+6)%7;
    d.setDate(d.getDate()-day);
    d.setHours(0,0,0,0);
    return Array.from({length:7}).map((_,i)=> {
      const x = new Date(d);
      x.setDate(d.getDate()+i);
      return x;
    });
  });

  hours = signal<string[]>([
    '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
    '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'
  ]);

  reservedCount = computed(() => Object.values(this.occupied()).filter(Boolean).length);

  constructor(private doctorsApi: DoctorsService, private apptApi: AppointmentsService, private snack: MatSnackBar) {
    this.doctorsApi.list().subscribe(d => {
      this.doctors.set(d);
      if (d.length && !this.doctorId()) this.doctorId.set(d[0].id);
    });

    effect(() => {
      const did = this.doctorId();
      const days = this.weekDays();
      if (!did || !days.length) return;
      this.loadWeekAvailability();
    });

    // alertas: cada 60s revisa próximas (hoy) y avisa
    setInterval(() => this.checkUpcoming(), 60000);
    setTimeout(() => this.checkUpcoming(), 2000);
  }

  setWeek(d: Date|null) { if (d) this.weekDate.set(d); }

  prevWeek(){ const d = new Date(this.weekDate()); d.setDate(d.getDate()-7); this.weekDate.set(d); }
  nextWeek(){ const d = new Date(this.weekDate()); d.setDate(d.getDate()+7); this.weekDate.set(d); }

  async loadWeekAvailability() {
    const did = this.doctorId();
    const occ: Record<string, boolean> = {};
    const days = this.weekDays();
    for (const day of days) {
      const date = ymd(day);
      try {
        const resp = await this.apptApi.availability(did, date).toPromise();
        this.slotMinutes.set(resp?.minutes ?? 30);
        (resp?.occupied ?? []).forEach(o => {
          const dt = new Date(o.inicio);
          const key = `${ymd(dt)}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
          occ[key] = true;
        });
      } catch {}
    }
    this.occupied.set(occ);
  }

  key(day: Date, hhmm: string) { return `${ymd(day)}T${hhmm}`; }

  isOccupied(day: Date, hhmm: string) {
    return !!this.occupied()[this.key(day, hhmm)];
  }

  reserve(day: Date, hhmm: string) {
    const did = this.doctorId();
    if (!did) return;
    const [hh, mm] = hhmm.split(':').map(Number);
    const dt = new Date(day);
    dt.setHours(hh, mm, 0, 0);

    const paciente = prompt('Paciente (nombre):');
    if (!paciente) return;

    this.apptApi.create({ pacienteNombre: paciente, medicoId: did, inicio: dt.toISOString(), estado: 'CONFIRMADA' as any })
      .subscribe({
        next: _ => {
          this.snack.open('Cita registrada', 'OK', { duration: 2000 });
          this.loadWeekAvailability();
        },
        error: err => {
          if (err?.status === 409) this.snack.open('Esa hora ya está reservada', 'OK', { duration: 3000 });
          else this.snack.open('Error al guardar', 'OK', { duration: 2500 });
        }
      });
  }

  async checkUpcoming() {
    // busca citas de hoy, confirma si hay alguna en los próximos 60 min
    const now = new Date();
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate()+1);

    try {
      const rows = await this.apptApi.list({
        status: 'CONFIRMADA',
        from: start.toISOString(),
        to: end.toISOString()
      }).toPromise();

      const soon = (rows ?? []).filter((r:any) => {
        const t = new Date(r.inicio).getTime();
        const diffMin = (t - now.getTime())/60000;
        return diffMin >= 0 && diffMin <= 60;
      }).sort((a:any,b:any)=> new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0];

      if (soon) {
        const when = new Date(soon.inicio).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        this.snack.open(`Cita próxima: ${soon.pacienteNombre} a las ${when} (${soon.medicoNombre})`, 'OK', { duration: 6000 });
      }
    } catch {}
  }
}
