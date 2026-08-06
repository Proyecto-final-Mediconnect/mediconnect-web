import { ProfessionalProfileForm } from '../features/profile/components/ProfessionalProfileForm';

export function ProfessionalProfilePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Mi perfil público</h1>
        <p className="mt-1 text-muted">
          Completá tu perfil para que los pacientes te encuentren y elijan.
        </p>
      </header>
      <ProfessionalProfileForm />
    </main>
  );
}
