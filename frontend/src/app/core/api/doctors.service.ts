import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Doctor } from '../models/doctor.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DoctorsService {
  constructor(private http: HttpClient) {}
  list(specialty?: string): Observable<Doctor[]> {
    const params: any = {};
    if (specialty) params.specialty = specialty;
    return this.http.get<Doctor[]>('/api/doctors', { params });
  }
}
