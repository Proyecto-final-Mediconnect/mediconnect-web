import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
  startMfaEnrollment,
  type MfaEnrollment,
} from '../api/mfaApi';
import { MfaCodeField } from './MfaCodeField';

const MFA_KEY = ['me', 'mfa'] as const;

const BOTON =
  'justify-self-start rounded-full bg-brand-deep px-5 py-2.5 text-[14px] font-semibold text-white disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';
const BOTON_SECUNDARIO =
  'justify-self-start rounded-full border border-line-strong bg-white px-5 py-2.5 text-[14px] font-semibold text-brand-deep hover:border-brand disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';
const TEXTO = 'text-[14px] leading-[1.6] text-muted';

/**
 * Verificación en dos pasos (ENG-88): además de la contraseña, un código de
 * seis números que cambia cada 30 segundos en una app autenticadora. Es
 * opcional y para los tres roles.
 *
 * Activarla son dos pasos: escanear el QR y confirmar con el primer código. Hasta
 * confirmarla no queda activa, así un QR escaneado a medias no deja a nadie
 * afuera de su cuenta. Desactivarla también pide un código: una sesión abierta
 * en una compu ajena no alcanza para sacarla.
 */
export function TwoStepVerification() {
  const queryClient = useQueryClient();
  const estado = useQuery({ queryKey: MFA_KEY, queryFn: getMfaStatus });
  const [alta, setAlta] = useState<MfaEnrollment | null>(null);
  const [desactivando, setDesactivando] = useState(false);
  const [codigo, setCodigo] = useState('');

  const refrescar = () => queryClient.invalidateQueries({ queryKey: MFA_KEY });
  const empezar = useMutation({ mutationFn: startMfaEnrollment, onSuccess: setAlta });
  const confirmar = useMutation({
    mutationFn: ({ factorId, code }: { factorId: string; code: string }) =>
      confirmMfaEnrollment(factorId, code),
    onSuccess: async () => {
      setAlta(null);
      empezar.reset(); // que el secreto y el QR no queden en el cache
      setCodigo('');
      await refrescar();
    },
  });
  const desactivar = useMutation({
    mutationFn: disableMfa,
    onSuccess: async () => {
      setDesactivando(false);
      setCodigo('');
      await refrescar();
    },
  });

  const activa = estado.data?.activa ?? false;
  const error = estado.error ?? empezar.error ?? confirmar.error ?? desactivar.error;

  function cambiarCodigo(valor: string) {
    setCodigo(valor);
    confirmar.reset();
    desactivar.reset();
  }

  return (
    <section
      aria-labelledby="dos-pasos"
      className="grid gap-3 rounded-[18px] border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="dos-pasos" className="font-display text-[20px] leading-tight text-brand-deep">
          Verificación en dos pasos
        </h2>
        {estado.data && (
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-bold ${
              activa ? 'bg-surface-teal text-brand-hover' : 'bg-surface text-muted'
            }`}
          >
            {activa ? 'Activa' : 'Desactivada'}
          </span>
        )}
      </div>

      {estado.isPending ? (
        <p role="status" className={TEXTO}>
          Cargando…
        </p>
      ) : alta ? (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (codigo.length === 6) confirmar.mutate({ factorId: alta.factorId, code: codigo });
          }}
        >
          <ol className={`${TEXTO} grid list-decimal gap-1 pl-5`}>
            <li>
              Abrí una app autenticadora: Google Authenticator, Microsoft Authenticator, Authy o la
              de tu gestor de contraseñas.
            </li>
            <li>Escaneá este código QR.</li>
            <li>Escribí el código de seis números que te muestra la app.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-5">
            <img
              src={alta.qr}
              alt="Código QR para la app autenticadora"
              className="size-[176px] rounded-[12px] border border-line bg-white p-2"
            />
            <div className="grid gap-1">
              <p className="text-[13px] text-muted">¿No podés escanearlo? Cargá esta clave:</p>
              <code className="break-all rounded-[8px] bg-surface px-3 py-2 font-mono text-[13px] text-ink">
                {alta.secret}
              </code>
            </div>
          </div>
          <MfaCodeField
            id="codigo-alta"
            label="Código de la app"
            value={codigo}
            onChange={cambiarCodigo}
            disabled={confirmar.isPending}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={BOTON}
              disabled={codigo.length !== 6 || confirmar.isPending}
            >
              {confirmar.isPending ? 'Activando…' : 'Activar'}
            </button>
            <button
              type="button"
              className={BOTON_SECUNDARIO}
              disabled={confirmar.isPending}
              onClick={() => {
                setAlta(null);
                empezar.reset();
                setCodigo('');
                confirmar.reset();
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : activa ? (
        <>
          <p className={TEXTO}>
            Cada vez que ingreses con tu contraseña te vamos a pedir el código de tu app
            autenticadora. Si perdés el teléfono, el equipo de MediConnect puede desactivarla para
            que vuelvas a entrar.
          </p>
          {desactivando ? (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (codigo.length === 6) desactivar.mutate(codigo);
              }}
            >
              <MfaCodeField
                id="codigo-baja"
                label="Para desactivarla, escribí el código de la app"
                value={codigo}
                onChange={cambiarCodigo}
                disabled={desactivar.isPending}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={BOTON}
                  disabled={codigo.length !== 6 || desactivar.isPending}
                >
                  {desactivar.isPending ? 'Desactivando…' : 'Desactivar'}
                </button>
                <button
                  type="button"
                  className={BOTON_SECUNDARIO}
                  disabled={desactivar.isPending}
                  onClick={() => {
                    setDesactivando(false);
                    setCodigo('');
                    desactivar.reset();
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className={BOTON_SECUNDARIO}
              onClick={() => setDesactivando(true)}
            >
              Desactivar
            </button>
          )}
        </>
      ) : (
        <>
          <p className={TEXTO}>
            Además de tu contraseña, te vamos a pedir un código de seis números de una app en tu
            teléfono. Si alguien consigue tu contraseña, igual no puede entrar a tu historia
            clínica.
          </p>
          <button
            type="button"
            className={BOTON}
            disabled={empezar.isPending}
            onClick={() => empezar.mutate()}
          >
            {empezar.isPending ? 'Preparando…' : 'Activar verificación en dos pasos'}
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {error.message}
        </p>
      )}
    </section>
  );
}
