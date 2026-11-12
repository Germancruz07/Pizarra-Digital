import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MIN_PASSWORD } from '../../services/supabase/authSupabase';

const RESEND_SECONDS = 60;

export function NewPasswordFields({ password, setPassword, confirm, setConfirm, idPrefix }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Nueva contraseña</span>
        <div className="relative">
          <input
            id={`${idPrefix}-new`}
            type={show ? 'text' : 'password'}
            className="field pr-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-describedby={`${idPrefix}-hint`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={show}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
        <span id={`${idPrefix}-hint`} className="mt-1 block text-xs text-slate-600">
          Mínimo {MIN_PASSWORD} caracteres.
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Repite la nueva contraseña</span>
        <input
          type={show ? 'text' : 'password'}
          className="field"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </label>
    </>
  );
}

export function checkNewPassword(password, confirm) {
  if (password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  if (password !== confirm) return 'Las dos contraseñas no coinciden.';
  return '';
}

/**
 * Cambio / recuperación de contraseña por correo:
 *  1) se envía un correo con un código de 6 dígitos y un enlace;
 *  2) se escribe el código y la nueva contraseña (o se abre el enlace del correo).
 * `presetEmail` fija el correo (cuando la persona ya ha iniciado sesión).
 */
export default function PasswordResetFlow({ presetEmail = '', onDone, onCancel }) {
  const { requestPasswordReset, verifyRecoveryCode, updatePassword } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(presetEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Supabase solo permite un correo por minuto a la misma dirección: el contador refleja ese límite real.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const sentTo = await requestPasswordReset(email);
      setEmail(sentTo);
      setStep('verify');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = async (e) => {
    e.preventDefault();
    const problem = checkNewPassword(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyRecoveryCode(email, code);
      await updatePassword(password);
      toast('Contraseña cambiada correctamente');
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="space-y-4 text-center" role="status">
        <CheckCircle2 size={40} className="mx-auto text-emerald-700" aria-hidden="true" />
        <p className="font-semibold text-slate-900">Contraseña cambiada correctamente.</p>
        <p className="text-sm text-slate-600">Ya puedes usar tu nueva contraseña en todos tus dispositivos.</p>
        <button type="button" className="btn-primary w-full" onClick={onDone}>
          Continuar
        </button>
      </div>
    );
  }

  if (step === 'request') {
    return (
      <form onSubmit={send} className="space-y-4" noValidate>
        <p className="text-sm leading-relaxed text-slate-700">
          Te enviaremos un correo con un <strong>enlace</strong> para elegir una contraseña nueva. Si el correo incluye
          también un código de 6 dígitos, puedes escribirlo aquí en su lugar.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Correo de tu cuenta</span>
          <div className="relative">
            <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="email"
              className="field pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!!presetEmail}
              autoComplete="email"
              required
            />
          </div>
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={busy || !email.trim()}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
            Enviar correo
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={confirmChange} className="space-y-4" noValidate>
      <p className="text-sm leading-relaxed text-slate-700" role="status">
        Si existe una cuenta con <strong>{email}</strong>, te hemos enviado un correo. <strong>Abre el enlace del
        correo</strong> (en este u otro dispositivo) y podrás elegir tu nueva contraseña. Si no lo ves, revisa la carpeta
        de spam.
      </p>
      <p className="text-sm text-slate-600">¿El correo trae un código de 6 dígitos? Entonces también puedes usarlo aquí:</p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Código del correo (opcional)</span>
        <div className="relative">
          <KeyRound size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            className="field pl-10 font-mono tracking-[0.3em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
      </label>
      <NewPasswordFields password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} idPrefix="reset" />
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline disabled:text-slate-600 disabled:no-underline"
          onClick={send}
          disabled={cooldown > 0 || busy}
        >
          {cooldown > 0 ? `Podrás reenviar el correo en ${cooldown} s` : 'Reenviar correo'}
        </button>
        <button type="submit" className="btn-primary" disabled={busy || code.length < 6}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Cambiar contraseña
        </button>
      </div>
    </form>
  );
}
