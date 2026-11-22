// Original seasonal background art drawn as SVG shapes (no third-party artwork).
import type { ThemeDef } from '@/lib/themes';

const MAPLE =
  'M0,-50 L9,-31 L21,-37 L17,-14 L37,-21 L31,-6 L47,0 L25,13 L29,25 L5,19 L3,46 L-3,46 L-5,19 L-29,25 L-25,13 L-47,0 L-31,-6 L-37,-21 L-17,-14 L-21,-37 L-9,-31 Z';
const OAK = 'M0,-50 C28,-32 30,28 0,50 C-30,28 -28,-32 0,-50 Z';
const HEART = 'M0,32 C-55,-4 -32,-52 0,-24 C32,-52 55,-4 0,32 Z';
const STAR = 'M0,-50 L12,-15 L48,-15 L19,6 L30,41 L0,20 L-30,41 L-19,6 L-48,-15 L-12,-15 Z';
const BAT =
  'M0,-6 C-6,-14 -10,-10 -12,-4 C-20,-14 -34,-14 -50,-4 C-40,-2 -36,6 -34,12 C-28,6 -20,6 -16,12 C-12,6 -6,6 0,12 C6,6 12,6 16,12 C20,6 28,6 34,12 C36,6 40,-2 50,-4 C34,-14 20,-14 12,-4 C10,-10 6,-14 0,-6 Z';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Shape({ kind, color }: { kind: string; color: string }) {
  switch (kind) {
    case 'maple':
      return <path d={MAPLE} fill={color} />;
    case 'oak':
      return (
        <g>
          <path d={OAK} fill={color} />
          <path d="M0,-44 L0,56" stroke="rgba(0,0,0,.18)" strokeWidth="3" />
        </g>
      );
    case 'heart':
      return <path d={HEART} fill={color} />;
    case 'star':
      return <path d={STAR} fill={color} />;
    case 'snow':
      return (
        <g stroke={color} strokeWidth="5" strokeLinecap="round" fill="none">
          {[0, 60, 120].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d="M0,-46 L0,46" />
              <path d="M0,-30 L-12,-42 M0,-30 L12,-42 M0,30 L-12,42 M0,30 L12,42" />
            </g>
          ))}
        </g>
      );
    case 'flower':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-24" rx="16" ry="24" fill={color} transform={`rotate(${a})`} />
          ))}
          <circle r="14" fill="#facc15" />
        </g>
      );
    case 'sun':
      return (
        <g fill={color}>
          <circle r="26" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M-5,-34 L5,-34 L0,-50 Z" transform={`rotate(${i * 30})`} />
          ))}
        </g>
      );
    case 'pumpkin':
      return (
        <g>
          <ellipse cx="-16" cy="6" rx="22" ry="30" fill={color} />
          <ellipse cx="16" cy="6" rx="22" ry="30" fill={color} />
          <ellipse cx="0" cy="6" rx="20" ry="32" fill={color} stroke="rgba(0,0,0,.2)" strokeWidth="2" />
          <rect x="-4" y="-34" width="8" height="12" rx="2" fill="#3f6212" />
        </g>
      );
    case 'bat':
      return <path d={BAT} fill={color} transform="scale(1.4)" />;
    case 'burst':
      return (
        <g stroke={color} strokeWidth="4" strokeLinecap="round">
          {Array.from({ length: 14 }, (_, i) => (
            <path key={i} d="M0,-14 L0,-48" transform={`rotate(${(i * 360) / 14})`} />
          ))}
        </g>
      );
    case 'dot':
      return <circle r="40" fill={color} />;
    default:
      return null;
  }
}

const KINDS: Record<string, string[]> = {
  fall: ['maple', 'maple', 'oak'],
  christmas: ['snow', 'star', 'snow'],
  newyear: ['star', 'burst', 'burst'],
  valentines: ['heart'],
  spring: ['flower', 'flower', 'dot'],
  summer: ['sun', 'dot'],
  canadaday: ['maple'],
  halloween: ['pumpkin', 'bat', 'bat', 'star'],
  generic: ['dot', 'star'],
};

export default function ThemeArt({ theme, width, height }: { theme: ThemeDef; width: number; height: number }) {
  const r = rng(theme.id.split('').reduce((n, c) => n * 31 + c.charCodeAt(0), 7));
  const kinds = KINDS[theme.id] ?? KINDS.generic;
  const items: { x: number; y: number; s: number; rot: number; kind: string; color: string; o: number }[] = [];
  const count = Math.round((width * height) / 26000);
  for (let i = 0; i < count; i++) {
    // Bias toward the page edges, where the product cards do not cover the art.
    const edge = r();
    let x = r() * width;
    let y = r() * height;
    if (edge < 0.35) x = r() < 0.5 ? r() * width * 0.12 : width - r() * width * 0.12;
    else if (edge < 0.55) y = r() < 0.5 ? r() * height * 0.2 : height - r() * height * 0.18;
    items.push({
      x,
      y,
      s: (0.25 + r() * 0.55) * (width / 816),
      rot: r() * 360,
      kind: kinds[Math.floor(r() * kinds.length)],
      color: theme.colors.art[Math.floor(r() * theme.colors.art.length)],
      o: 0.35 + r() * 0.5,
    });
  }
  return (
    <svg className="fl-art" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${theme.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.colors.bgTop} />
          <stop offset="1" stopColor={theme.colors.bgBottom} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill={`url(#g-${theme.id})`} />
      {theme.id === 'canadaday' && (
        <>
          <rect width={width * 0.08} height={height} fill="#dc2626" opacity="0.9" />
          <rect x={width * 0.92} width={width * 0.08} height={height} fill="#dc2626" opacity="0.9" />
        </>
      )}
      {items.map((it, i) => (
        <g key={i} transform={`translate(${it.x.toFixed(1)},${it.y.toFixed(1)}) rotate(${it.rot.toFixed(0)}) scale(${it.s.toFixed(3)})`} opacity={it.o.toFixed(2)}>
          <Shape kind={it.kind} color={it.color} />
        </g>
      ))}
    </svg>
  );
}
