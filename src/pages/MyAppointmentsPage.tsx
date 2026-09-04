import { MyAppointments } from '../features/appointments/components/MyAppointments';
import { DashboardLayout } from './DashboardLayout';

/**
 * Mis turnos (ENG-55). Una sola ruta para paciente y profesional: el endpoint
 * devuelve los turnos de cada uno según su rol en ellos, así que duplicar la
 * pantalla por rol sería duplicar la misma vista.
 */
export function MyAppointmentsPage() {
  return (
    <DashboardLayout
      barTitle="Mis turnos"
      subtitle="Tus consultas agendadas y las que ya pasaron."
    >
      <MyAppointments />
    </DashboardLayout>
  );
}
