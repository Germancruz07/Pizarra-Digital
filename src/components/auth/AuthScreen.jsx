import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, PenLine, Shapes, Sparkles, Type, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AvatarPicker from './AvatarPicker';
import ThemeToggle from '../ui/ThemeToggle';
import { randomAvatar } from '../../data/avatars';

function Field({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      {children}
    </div>
  );
}

const FEATURES = [
  { icon: PenLine, text: 'Lápiz suave, formas, flechas y texto editable' },
  { icon: Shapes, text: 'Cada trazo es un objeto: muévelo y redimensiónalo' },
  { icon: Sparkles, text: 'Autoguardado en tu cuenta, al instante' },
];

function Hero() {
  return (
    <div className="relative hidden overflow-hidden bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="animate-blob absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="animate-blob absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-fuchsia-300/20 blur-3xl [animation-delay:-5s]" />

      <div className="relative flex items-center gap-3 text-white">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
          <PenLine size={22} />
        </div>
        <span className="text-xl font-bold tracking-tight">Pizarra</span>
      </div>

      <div className="relative h-72">
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
        <motion.svg
          viewBox="0 0 300 120"
          className="absolute left-10 top-40 w-80"
          initial={{ pathLength: 0 }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
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
          className="absolute right-10 top-28 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-2xl"
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
          {FEATURES.map(({ icon: Icon, text }, i) => (
            <motion.li
              key={text}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
              className="flex items-center gap-3 text-white/90"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                <Icon size={16} />
              </span>
              {text}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [avatar, setAvatar] = useState(randomAvatar);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
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
      if (isRegister) {
        const u = await register({ ...form, avatar });
        toast(`¡Bienvenido, ${u.name.split(' ')[0]}! Te preparamos una pizarra de ejemplo.`);
      } else {
        const u = await login(form);
        toast(`¡Hola de nuevo, ${u.name.split(' ')[0]}!`);
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
      <div className="relative flex items-center justify-center overflow-hidden px-5 py-10">
        <ThemeToggle className="absolute right-4 top-4 z-10" />
        <div className="animate-blob absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl lg:hidden" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
          className="relative w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <PenLine size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight">Pizarra</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
              </h2>
              <p className="mt-1.5 text-slate-500">
                {isRegister ? 'Tu espacio privado para pensar en grande.' : 'Inicia sesión para ver tus pizarras.'}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="relative mt-7 flex rounded-2xl bg-slate-200/60 p-1 text-sm font-semibold">
            {[
              ['login', 'Iniciar sesión'],
              ['register', 'Registrarse'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                className={`relative z-10 flex-1 rounded-xl py-2.5 transition-colors ${mode === id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {mode === id && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                {label}
              </button>
            ))}
          </div>

          <form key={shake} onSubmit={submit} className={`mt-6 space-y-3.5 ${shake ? 'animate-shake' : ''}`}>
            <AnimatePresence initial={false}>
              {isRegister && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5 overflow-hidden"
                >
                  <Field icon={User}>
                    <input className="field pl-10" placeholder="Tu nombre" value={form.name} onChange={set('name')} autoComplete="name" />
                  </Field>
                  <AvatarPicker value={avatar} onChange={setAvatar} name={form.name} />
                </motion.div>
              )}
            </AnimatePresence>

            <Field icon={Mail}>
              <input
                className="field pl-10"
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
            </Field>
            <Field icon={Lock}>
              <input
                className="field pl-10 pr-11"
                type={showPw ? 'text' : 'password'}
                placeholder={isRegister ? 'Contraseña (mín. 6 caracteres)' : 'Contraseña'}
                value={form.password}
                onChange={set('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={busy} className="btn-primary group w-full py-3">
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {isRegister ? 'Crear cuenta' : 'Entrar'}
              {!busy && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate gratis'}
            </button>
          </p>
          <p className="mt-4 text-center text-xs text-slate-400">
            Tus datos se guardan de forma privada en este navegador.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
