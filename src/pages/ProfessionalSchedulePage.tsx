import { WeeklyScheduleForm } from '../features/schedule/components/WeeklyScheduleForm';

export function ProfessionalSchedulePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Mi agenda</h1>
        <p className="mt-1 text-muted">
          Definí cuándo atendés. Los pacientes solo van a poder reservar en esos
          horarios.
        </p>
      </header>
      <WeeklyScheduleForm />
    </main>
  );
}
