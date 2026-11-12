import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Plus } from 'lucide-react';
import Modal from '../ui/Modal';
import { BACKGROUNDS, backgroundCss } from '../../canvas/constants';

export default function NewBoardModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [background, setBackground] = useState('grid');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setBackground('grid');
      setBusy(false);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate({ name: name.trim() || 'Pizarra sin título', background });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva pizarra" subtitle="Ponle nombre y elige un fondo inicial." icon={Plus} width="max-w-lg">
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
          <input
            autoFocus
            className="field"
            placeholder="Ej. Lluvia de ideas del proyecto"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fondo</span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(BACKGROUNDS).map(([key, bg]) => {
              const active = background === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBackground(key)}
                  className={`group relative rounded-2xl p-1.5 text-left transition ${active ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'ring-1 ring-slate-200 hover:ring-slate-300'}`}
                >
                  <div className="aspect-[4/3] rounded-xl shadow-inner ring-1 ring-slate-900/5" style={backgroundCss(key, 10)} />
                  <span className={`mt-1.5 block px-1 text-xs font-semibold ${active ? 'text-indigo-700' : 'text-slate-600'}`}>{bg.label}</span>
                  {active && (
                    <motion.span
                      layoutId="bg-check"
                      className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-indigo-500 text-white shadow"
                    >
                      <Check size={12} strokeWidth={3} />
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear pizarra
          </button>
        </div>
      </form>
    </Modal>
  );
}
