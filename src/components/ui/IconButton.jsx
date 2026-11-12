import { forwardRef } from 'react';

/** Botón de icono con tooltip animado. `tipSide` = 'bottom' | 'top'. */
const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, onClick, active = false, disabled = false, danger = false, tipSide = 'bottom', size = 18, className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`group relative grid h-9 w-9 place-items-center rounded-xl transition-all duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
          : danger
            ? 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      } ${className}`}
      {...rest}
    >
      {Icon && <Icon size={size} strokeWidth={2} />}
      {children}
      {label && (
        <span
          className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#111827] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-disabled:hidden ${
            tipSide === 'top' ? 'bottom-full mb-2 translate-y-1 group-hover:translate-y-0' : 'top-full mt-2 -translate-y-1 group-hover:translate-y-0'
          }`}
        >
          {label}
        </span>
      )}
    </button>
  );
});

export default IconButton;
