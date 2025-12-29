export type AppointmentStatus = 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA';

export interface Appointment {
  id: string;
  pacienteNombre: string;
  medicoId: string;
  medicoNombre?: string;
  especialidad?: string;
  inicio: string; // ISO
  fin: string;    // ISO
  estado: AppointmentStatus;
  createdAt?: string;
}
