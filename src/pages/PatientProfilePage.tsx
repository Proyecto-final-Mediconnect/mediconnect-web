import { PatientProfileForm } from '../features/patient-profile/components/PatientProfileForm';

export function PatientProfilePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Mi perfil</h1>
        <p className="mt-1 text-muted">
          Completá tus datos para que los profesionales puedan atenderte.
        </p>
      </header>
      <PatientProfileForm />
    </main>
  );
}
