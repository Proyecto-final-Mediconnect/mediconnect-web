import { Link } from 'react-router-dom';
import { Button } from '../shared/ui/Button';
import { Logo } from '../shared/ui/Logo';

const features = [
  {
    title: 'Videoconsultas seguras',
    text: 'Atendete por videollamada con cifrado de extremo a extremo, sin salir de casa.',
    icon: '🔒',
  },
  {
    title: 'Turnos en minutos',
    text: 'Encontrá especialistas verificados y reservá en el horario que te quede mejor.',
    icon: '📅',
  },
  {
    title: 'Tu historia, siempre con vos',
    text: 'Accedé a tu historia clínica y a tus estudios desde cualquier dispositivo.',
    icon: '❤️',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-svh bg-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/ingresar">
            <Button variant="ghost">Iniciar sesión</Button>
          </Link>
          <Link to="/registro">
            <Button variant="primary">Crear cuenta</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-block rounded-full bg-surface-teal px-3 py-1 text-sm font-medium text-brand-hover">
            Salud digital para todos
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-brand-deep sm:text-5xl">
            Tu salud, <span className="text-brand">conectada</span> en un solo
            lugar.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Reservá turnos, atendete por videoconsulta y llevá tu historia
            clínica siempre con vos. MediConnect acerca a pacientes y
            profesionales de forma simple y segura.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/registro">
              <Button variant="primary" className="px-6 py-3 text-base">
                Crear mi cuenta
              </Button>
            </Link>
            <Link to="/ingresar">
              <Button variant="secondary" className="px-6 py-3 text-base">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand/20 to-brand-bright/10 blur-2xl" />
          <img
            src="/app-preview.png"
            alt="Vista de la aplicación MediConnect"
            className="relative w-full rounded-2xl border border-slate-200 shadow-2xl"
          />
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-teal text-2xl">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-deep">
                {feature.title}
              </h3>
              <p className="mt-2 text-muted">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} MediConnect — UTN FRC · Proyecto Final</p>
        </div>
      </footer>
    </div>
  );
}
