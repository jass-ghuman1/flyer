// Neutral product outline shown when a slot has no image.
export default function Silhouette({ size }: { size: string }) {
  const box = size === '4L';
  const pack = /pk$/.test(size);
  return (
    <svg viewBox="0 0 100 140" className="sil" aria-hidden="true">
      {box ? (
        <g>
          <path d="M14,30 L70,18 L90,30 L90,128 L34,138 L14,128 Z" fill="#d6d3d1" />
          <path d="M14,30 L34,40 L34,138 L14,128 Z" fill="#a8a29e" />
          <path d="M14,30 L70,18 L90,30 L34,40 Z" fill="#e7e5e4" />
          <rect x="42" y="12" width="18" height="10" rx="3" fill="#78716c" />
        </g>
      ) : pack ? (
        <g>
          <rect x="6" y="40" width="88" height="90" rx="6" fill="#d6d3d1" />
          <rect x="6" y="40" width="88" height="22" rx="6" fill="#a8a29e" />
          {[18, 40, 62].map((x) => (
            <rect key={x} x={x} y="18" width="20" height="26" rx="5" fill="#e7e5e4" />
          ))}
        </g>
      ) : (
        <g>
          <rect x="42" y="6" width="16" height="10" rx="2" fill="#78716c" />
          <path d="M43,16 L57,16 L57,40 C57,48 72,52 72,66 L72,128 C72,133 68,136 64,136 L36,136 C32,136 28,133 28,128 L28,66 C28,52 43,48 43,40 Z" fill="#a8a29e" />
          <rect x="31" y="78" width="38" height="34" rx="2" fill="#e7e5e4" />
        </g>
      )}
    </svg>
  );
}
