import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Appointment } from '../models/appointment.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  constructor(private http: HttpClient) {}

  list(params: any): Observable<Appointment[]> {
    return this.http.get<Appointment[]>('/api/appointments', { params });
  }

  create(payload: Partial<Appointment>) {
    return this.http.post<{id:string}>('/api/appointments', payload);
  }

  patch(id: string, payload: any) {
    return this.http.patch('/api/appointments/' + id, payload);
  }

  availability(doctorId: string, date: string) {
    return this.http.get<{minutes:number, occupied: {inicio:string, fin:string, estado:string}[]}>('/api/availability', {
      params: { doctorId, date }
    });
  }

  stats(params: any) {
    return this.http.get<any>('/api/appointments/stats', { params });
  }
}
