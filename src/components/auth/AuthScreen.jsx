import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, AtSign, ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, PenLine, Shapes, ShieldCheck, Type, User } from 'lucide-react';
import PasswordResetFlow from './PasswordResetFlow';
import { MIN_PASSWORD } from '../../services/supabase/authSupabase';
import { isCloud as CLOUD } from '../../services/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AvatarPicker from './AvatarPicker';
import ThemeToggle from '../ui/ThemeToggle';
import SiteFooter from '../legal/SiteFooter';
import { randomAvatar } from '../../data/avatars';

function Field({ icon: Icon, id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Icon size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
        {children}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
    </div>
  );
}

const FEATURES = [
  { icon: PenLine, text: 'Lápiz suave, formas, flechas y texto editable' },
  { icon: Shapes, text: 'Cada trazo es un objeto: muévelo y redimensiónalo' },
  {
    icon: ShieldCheck,
    text: CLOUD ? 'Sin rastreo: tus pizarras en todos tus dispositivos' : 'Sin rastreo: tus pizarras se guardan solo en tu navegador',
  },
];

function Hero() {
  return (
    <div className="relative hidden overflow-hidden bg-linear-to-br from-indigo-700 via-violet-700 to-fuchsia-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden="true" className="animate-blob absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden="true" className="animate-blob absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-fuchsia-300/20 blur-3xl [animation-delay:-5s]" />

      <div className="relative flex items-center gap-3 text-white">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur" aria-hidden="true">
          <PenLine size={22} />
        </div>
        <span className="text-xl font-bold tracking-tight">Pizarra</span>
      </div>

      {/* Ilustración decorativa */}
      <div className="relative h-72" aria-hidden="true">
        <motion.div
          className="absolute left-6 top-4 h-28 w-40 rounded-2xl border-4 border-white/80 bg-amber-200/90 shadow-2xl"
          animate={{ y: [0, -12, 0], rotate: [-4, -2, -4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-56 top-0 h-32 w-32 rounded-full border-4 border-white/80 bg-sky-300/80 shadow-2xl"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.svg viewBox="0 0 300 120" className="absolute left-10 top-40 w-80" animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
          <motion.path
            d="M10 80 C 60 10, 110 120, 160 50 S 260 20, 290 70"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', repeatDelay: 1 }}
          />
        </motion.svg>
        <motion.div
          className="absolute right-10 top-28 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-800 shadow-2xl"
          animate={{ y: [0, -10, 0], rotate: [3, 1, 3] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Type size={16} /> ¡Ideas en grande!
        </motion.div>
      </div>

      <div className="relative space-y-6 text-white">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
          Tu pizarra digital,
          <br />
          siempre donde la dejaste.
        </h1>
        <ul className="space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-white">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15" aria-hidden="true">
                <Icon size={16} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { login, register, isCloud } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [avatar, setAvatar] = useState(randomAvatar);
  const [showAvatar, setShowAvatar] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  const [view, setView] = useState('form'); // 'form' | 'forgot' | 'confirm'
  const [confirmEmail, setConfirmEmail] = useState('');

  const isRegister = mode === 'register';
  const minPassword = isCloud ? MIN_PASSWORD : 6;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const identity = isCloud ? { email: form.username } : { username: form.username };
      if (isRegister) {
        const result = await register({ ...identity, displayName: form.displayName, password: form.password, avatar, acceptedTerms });
        if (result.needsConfirmation) {
          setConfirmEmail(result.email);
          setView('confirm');
        } else {
          toast(`¡Bienvenido, ${result.user.name}! Te preparamos una pizarra de ejemplo.`);
        }
      } else {
        const u = await login({ ...identity, password: form.password });
        toast(`¡Hola de nuevo, ${u.name}!`);
      }
    } catch (err) {
      setError(err.message);
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <Hero />
      <div className="relative flex flex-col overflow-hidden">
        <ThemeToggle className="absolute right-4 top-4 z-10" />
        <main id="contenido" className="flex flex-1 items-center justify-center px-5 py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            className="relative w-full max-w-md"
          >
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-500/30" aria-hidden="true">
                <PenLine size={22} />
              </div>
              <span className="text-xl font-bold tracking-tight">Pizarra</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </h2>
            <p className="mt-1.5 text-slate-600">
              {isRegister
                ? `Solo necesitas ${isCloud ? 'un correo' : 'un usuario'} y una contraseña.`
                : 'Inicia sesión para ver tus pizarras.'}
            </p>

            {view === 'confirm' && (
              <div className="mt-7 space-y-4 rounded-2xl border border-slate-200 p-5" role="status">
                <MailCheck size={32} className="text-indigo-700" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-slate-900">Revisa tu correo</h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  Te enviamos un enlace a <strong>{confirmEmail}</strong> para confirmar tu cuenta. Ábrelo y entrarás
                  directamente. Si no lo ves en unos minutos, revisa la carpeta de spam.
                </p>
                <button type="button" className="btn-ghost w-full" onClick={() => { setView('form'); switchMode('login'); }}>
                  Volver a iniciar sesión
                </button>
              </div>
            )}

            {view === 'forgot' && (
              <div className="mt-7 rounded-2xl border border-slate-200 p-5">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Recuperar contraseña</h3>
                <PasswordResetFlow onCancel={() => setView('form')} onDone={() => setView('form')} />
              </div>
            )}

            {view === 'form' && (
            <>
            <div role="tablist" aria-label="Acceso" className="relative mt-7 flex rounded-2xl bg-slate-200/60 p-1 text-sm font-semibold">
              {[
                ['login', 'Iniciar sesión'],
                ['register', 'Crear cuenta'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => switchMode(id)}
                  className={`relative z-10 flex-1 rounded-xl py-2.5 transition-colors ${mode === id ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  {mode === id && (
                    <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-xl bg-white shadow" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                  )}
                  {label}
                </button>
              ))}
            </div>

            <form key={shake} onSubmit={submit} noValidate className={`mt-6 space-y-4 ${shake ? 'animate-shake' : ''}`}>
              {isCloud ? (
                <Field
                  icon={Mail}
                  id="username"
                  label="Correo electrónico"
                  hint={isRegister ? 'Lo usarás para entrar y para recuperar tu contraseña. No enviamos publicidad.' : null}
                >
                  <input
                    id="username"
                    type="email"
                    className="field pl-10"
                    value={form.username}
                    onChange={set('username')}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby={isRegister ? 'username-hint' : undefined}
                    required
                  />
                </Field>
              ) : (
                <Field
                  icon={AtSign}
                  id="username"
                  label="Usuario"
                  hint={isRegister ? '3 a 30 caracteres: letras sin acentos, números, punto, guion o guion bajo.' : 'Si creaste tu cuenta con un correo, escríbelo aquí.'}
                >
                  <input
                    id="username"
                    className="field pl-10"
                    value={form.username}
                    onChange={set('username')}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby="username-hint"
                    required
                  />
                </Field>
              )}

              <Field icon={Lock} id="password" label="Contraseña" hint={isRegister ? `Mínimo ${minPassword} caracteres.` : null}>
                <input
                  id="password"
                  className="field pl-10 pr-11"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  aria-describedby={isRegister ? 'password-hint' : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPw}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </Field>

              {isCloud && !isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('forgot');
                  }}
                  className="-mt-1 text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              <AnimatePresence initial={false}>
                {isRegister && (
                  <motion.div
                    key="register-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <Field icon={User} id="displayName" label="Nombre visible (opcional)" hint={`Si lo dejas vacío, se mostrará ${isCloud ? 'la primera parte de tu correo' : 'tu usuario'}.`}>
                      <input
                        id="displayName"
                        className="field pl-10"
                        value={form.displayName}
                        onChange={set('displayName')}
                        maxLength={40}
                        autoComplete="nickname"
                        aria-describedby="displayName-hint"
                      />
                    </Field>

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAvatar((v) => !v)}
                        aria-expanded={showAvatar}
                        className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-800"
                      >
                        <ChevronDown size={16} className={`transition-transform ${showAvatar ? 'rotate-180' : ''}`} aria-hidden="true" />
                        Personalizar avatar (opcional)
                      </button>
                      {showAvatar && (
                        <div className="mt-2">
                          <AvatarPicker value={avatar} onChange={setAvatar} name={form.displayName || form.username} />
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        required
                      />
                      <span>
                        He leído y acepto los{' '}
                        <a href="#/legal/terminos" target="_blank" rel="noopener" className="font-semibold text-indigo-700 underline underline-offset-2">
                          Términos y condiciones
                        </a>{' '}
                        y la{' '}
                        <a href="#/legal/privacidad" target="_blank" rel="noopener" className="font-semibold text-indigo-700 underline underline-offset-2">
                          Política de privacidad
                        </a>
                        .
                      </span>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" disabled={busy || (isRegister && !acceptedTerms)} className="btn-primary group w-full py-3">
                {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
                {isRegister ? 'Crear cuenta' : 'Entrar'}
                {!busy && <ArrowRight size={17} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? 'login' : 'register')}
                className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
              >
                {isRegister ? 'Inicia sesión' : 'Crea una gratis'}
              </button>
            </p>
            </>
            )}
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-600">
              {isCloud
                ? 'Tus pizarras se guardan en tu cuenta en la nube para que las veas en todos tus dispositivos. Solo tú puedes acceder a ellas, y puedes descargarlas o borrarlas cuando quieras desde tu perfil.'
                : 'Tus datos se guardan solo en este navegador: no se envían a ningún servidor. Puedes descargarlos o borrarlos cuando quieras desde tu perfil.'}
            </p>
          </motion.div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
