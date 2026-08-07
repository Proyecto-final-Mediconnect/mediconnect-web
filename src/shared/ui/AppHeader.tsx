import { useLogout, useSession } from '../../features/auth/hooks/useSession';
import { Button } from './Button';
import { Logo } from './Logo';

/** Barra superior de las pantallas privadas: marca, usuario y cerrar sesión. */
export function AppHeader() {
  const { user } = useSession();
  const { mutate: logout, isPending } = useLogout();

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Logo />
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="hidden text-sm text-muted sm:inline">
              {displayName}
            </span>
          )}
          {/* Al limpiarse la sesión, RequireAuth redirige solo al login: una
              sola fuente de verdad para la navegación post-logout. */}
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => logout()}
          >
            {isPending ? 'Saliendo…' : 'Cerrar sesión'}
          </Button>
        </div>
      </div>
    </header>
  );
}
