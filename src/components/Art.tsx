import { useId } from 'react';
export function Character({ type = 'P', className = '' }: { type?: string; className?: string }) {
  const uid = useId().replaceAll(':', '');
  return (
    <svg
      className={`character ${className}`}
      viewBox="0 0 280 280"
      role="img"
      aria-label={
        type === 'P'
          ? '温柔的太阳人格插画'
          : type === 'G'
            ? '闪耀的星星人格插画'
            : type === 'NPC'
              ? '隐藏角色人格插画'
              : '安静的月亮人格插画'
      }
    >
      <defs>
        <pattern id={uid} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="currentColor" opacity=".08" />
        </pattern>
      </defs>
      <circle cx="140" cy="138" r="108" fill={`url(#${uid})`} />
      <g
        fill="none"
        stroke={type === 'NPC' ? '#D8B66D' : '#38314E'}
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M64 213q-8 12-13 3m165-43q14 0 15-11M82 83l-7-7m139 28 8-3" />
        <path
          d="M46 118l3-9 3 9 9 3-9 3-3 9-3-9-9-3zm175 106 3-8 3 8 8 3-8 3-3 8-3-8-8-3z"
          fill={type === 'P' ? '#F7CF6E' : '#CABCF4'}
          strokeWidth="1.5"
        />
        {type === 'P' ? (
          <>
            <g fill="#F1AF54">
              {Array.from({ length: 10 }, (_, i) => (
                <ellipse
                  key={i}
                  cx="140"
                  cy="68"
                  rx="20"
                  ry="35"
                  transform={`rotate(${i * 36} 140 139)`}
                />
              ))}
            </g>
            <circle cx="140" cy="139" r="59" fill="#FFE295" />
            <path d="M122 188l-8 38m43-38 10 38M114 226q-17-3-15 5h24m45-5q17-3 15 5h-24M85 149q-22 0-21-17m132 17q21-2 20-17" />
            <path d="M114 133q5-10 10 0m33 0q5-10 10 0m-39 20q13 13 25 0" />
            <ellipse cx="112" cy="146" rx="9" ry="5" fill="#F0AB81" stroke="none" />
            <ellipse cx="169" cy="146" rx="9" ry="5" fill="#F0AB81" stroke="none" />
          </>
        ) : type === 'G' ? (
          <>
            <path d="M142 44l29 53 60 11-42 46 7 64-56-28-57 28 8-65-43-45 62-11z" fill="#A18BE0" />
            <path
              d="M143 64l16 42 45 9-35 30 9 44-38-23-37 21 7-43-31-29 43-7z"
              fill="#C8B8F4"
              stroke="none"
            />
            <path d="M116 135v8m46-8v8m-35 13q13 10 23-1M111 204l-7 24m66-24 7 24M104 228h-16m89 0h16M65 129q-18-10-18-24m167 28q17-1 23-22" />
            <path d="M174 40l3-9 3 9 9 3-9 3-3 9-3-9-9-3z" fill="#F4D27A" strokeWidth="1.5" />
          </>
        ) : type === 'NPC' ? (
          <>
            <path
              d="M80 190q-13-84 10-112 20-37 49-37t48 37q24 33 14 112l-22 38-40-16-39 16z"
              fill="#463256"
            />
            <path d="M94 114q44-61 89 0l-7 53q-39 29-73 0z" fill="#E3C48A" />
            <path d="M117 130h2m42 0h2m-37 22q14 8 27 0m-43 72-8 11m65-12 8 12" />
            <path d="M87 104l53-37 49 37M139 168v44" />
            <path d="M211 66l4-14 4 14 14 4-14 4-4 14-4-14-14-4z" fill="#D8B66D" />
          </>
        ) : (
          <>
            <path
              d="M166 47c-70-5-108 47-94 104 12 52 68 78 113 48 30-18 40-45 37-69-16 22-43 26-65 11-32-23-28-62 9-94z"
              fill="#B3BCD6"
            />
            <path d="M115 127q5-7 11 0m22 18q6-5 11 2m-36 12q11 12 23 3M101 197l-9 30m57-20 4 23m-61-3H77m76 3h16M74 146q-17 2-19-13m134 34q20 3 26-9" />
            <path
              d="M196 65l5-15 5 15 15 5-15 5-5 15-5-15-15-5z"
              fill="#E9D27E"
              strokeWidth="1.5"
            />
            <circle cx="104" cy="145" r="4" fill="#D1A7B7" stroke="none" />
          </>
        )}
        <path d="M91 251q45 8 95-1" opacity=".15" />
      </g>
    </svg>
  );
}
export function Radar({
  scores,
  color = '#6952C7',
}: {
  scores: Record<string, number>;
  color?: string;
}) {
  const points = (scale: number) =>
    [
      [160, 35],
      [268, 222],
      [52, 222],
    ]
      .map(([x, y]) => `${160 + (x - 160) * scale},${160 + (y - 160) * scale}`)
      .join(' ');
  const data = [
    [160, 35],
    [268, 222],
    [52, 222],
  ].map(([x, y], i) => {
    const n = scores[['P', 'G', 'M'][i]] / 100;
    return [160 + (x - 160) * n, 160 + (y - 160) * n];
  });
  return (
    <svg
      className="radar"
      viewBox="0 0 320 275"
      role="img"
      aria-label={`亲和感${scores.P}分，气场感${scores.G}分，神秘感${scores.M}分`}
    >
      <polygon points={points(1)} fill="#faf9fe" />
      {[0.2, 0.4, 0.6, 0.8, 1].map((s) => (
        <polygon key={s} points={points(s)} fill="none" stroke="#e3deef" />
      ))}
      {[
        [160, 35],
        [268, 222],
        [52, 222],
      ].map(([x, y], i) => (
        <line key={i} x1="160" y1="160" x2={x} y2={y} stroke="#e3deef" />
      ))}
      {[0, 20, 40, 60, 80, 100].map((n) => (
        <text key={n} x="166" y={164 - n * 1.25} fill="#80778f" fontSize="9">
          {n}
        </text>
      ))}
      <polygon
        className="radar-shape"
        points={data.map((p) => p.join(',')).join(' ')}
        fill={color}
        fillOpacity=".2"
        stroke={color}
        strokeWidth="2.5"
      />
      {data.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={color} />
      ))}
      <g fontSize="12" fill="#514761" textAnchor="middle">
        <text x="160" y="18">
          亲和感
        </text>
        <text x="275" y="248">
          气场感
        </text>
        <text x="44" y="248">
          神秘感
        </text>
      </g>
    </svg>
  );
}
