import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Shuffle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { AVATAR_EMOJIS, AVATAR_GRADIENTS, randomAvatar } from '../../data/avatars';
import { fileToAvatarDataUrl } from '../../utils/image';

const TABS = [
  ['emoji', 'Emoji'],
  ['initials', 'Iniciales'],
  ['image', 'Foto'],
];

export default function AvatarPicker({ value, onChange, name }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');

  const setType = (type) => {
    if (type === 'image') {
      if (value.type === 'image' && value.value) return;
      fileRef.current?.click();
      return;
    }
    onChange({
      ...value,
      type,
      value: type === 'emoji' ? (value.type === 'emoji' ? value.value : AVATAR_EMOJIS[0]) : null,
    });
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setError('');
      onChange({ ...value, type: 'image', value: await fileToAvatarDataUrl(file) });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center gap-3">
        <motion.div key={`${value.type}-${value.value}-${value.gradient}`} initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
          <Avatar avatar={value} name={name || 'Tú'} size={52} />
        </motion.div>
        <div className="flex-1">
          <div className="relative flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                className={`relative z-10 flex-1 rounded-lg py-1.5 transition-colors ${value.type === id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {value.type === id && (
                  <motion.span layoutId="avatar-tab" className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-indigo-600"
          title="Aleatorio"
        >
          <Shuffle size={16} />
        </button>
      </div>

      {value.type === 'emoji' && (
        <div className="scroll-thin mt-3 grid max-h-24 grid-cols-8 gap-1 overflow-y-auto">
          {AVATAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange({ ...value, value: emoji })}
              className={`grid h-8 place-items-center rounded-lg text-lg transition hover:scale-110 hover:bg-white ${value.value === emoji ? 'bg-white shadow-sm ring-2 ring-indigo-400' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {value.type === 'image' && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          <Camera size={14} /> Cambiar foto
        </button>
      )}

      {value.type !== 'image' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {AVATAR_GRADIENTS.map(([a, b], i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange({ ...value, gradient: i })}
              className={`h-6 w-6 rounded-full transition hover:scale-110 ${value.gradient === i ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
              style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
              aria-label={`Color ${i + 1}`}
            />
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
    </div>
  );
}
