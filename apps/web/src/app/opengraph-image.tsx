import { ImageResponse } from 'next/og';

export const alt = 'Nexus — a calm, block-based knowledge system for your team';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px',
          background:
            'radial-gradient(1200px 600px at 15% 10%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(900px 500px at 95% 100%, rgba(255,255,255,0.04), transparent 60%), #0a0a0a',
          color: '#ffffff',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0a0a',
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: '-0.04em',
            }}
          >
            N
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Nexus
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              maxWidth: 940,
            }}
          >
            Your team's knowledge, organized.
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 860,
              letterSpacing: '-0.01em',
            }}
          >
            A calm, block-based workspace to write, structure ideas, and collaborate — all in one place.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.02em',
          }}
        >
          <div>nexus.app</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <span>Docs</span>
            <span>·</span>
            <span>Teamspaces</span>
            <span>·</span>
            <span>Calendar</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
