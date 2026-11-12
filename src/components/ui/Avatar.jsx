import { AVATAR_GRADIENTS, initialsOf } from '../../data/avatars';

export default function Avatar({ avatar, name = '', size = 36, className = '', ring = true }) {
  const a = avatar || { type: 'initials', gradient: 0 };
  const [c1, c2] = AVATAR_GRADIENTS[a.gradient ?? 0] || AVATAR_GRADIENTS[0];
  return (
    <div
      className={`relative grid shrink-0 select-none place-items-center overflow-hidden rounded-full font-semibold text-white shadow-sm ${
        ring ? 'ring-2 ring-white' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        fontSize: a.type === 'emoji' ? size * 0.52 : size * 0.38,
      }}
    >
      {a.type === 'image' && a.value ? (
        <img src={a.value} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : a.type === 'emoji' ? (
        <span className="leading-none">{a.value}</span>
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  );
}
