import { ImageResponse } from 'next/og';

export const alt = 'Nexus — A calm home for everything you know';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: '#f2ede2',
          position: 'relative',
        }}
      >
        {/* ── Decorative blocks (right side, bleeds off edge) ── */}

        {/* Block 1 — gold */}
        <div
          style={{
            position: 'absolute',
            left: '920px',
            top: '88px',
            width: '340px',
            height: '108px',
            borderRadius: '20px',
            background: '#c08a3e',
          }}
        />
        {/* Block 2 — clay */}
        <div
          style={{
            position: 'absolute',
            left: '966px',
            top: '216px',
            width: '340px',
            height: '108px',
            borderRadius: '20px',
            background: '#b14e2c',
          }}
        />
        {/* Block 3 — ink */}
        <div
          style={{
            position: 'absolute',
            left: '1012px',
            top: '344px',
            width: '340px',
            height: '108px',
            borderRadius: '20px',
            background: '#241f18',
          }}
        />

        {/* ── Left content ── */}
        <div
          style={{
            position: 'absolute',
            left: '88px',
            top: '0px',
            bottom: '0px',
            width: '800px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Logo row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '52px',
            }}
          >
            {/* Mini blocks mark */}
            <div style={{ position: 'relative', width: '34px', height: '28px', display: 'flex' }}>
              <div style={{ position: 'absolute', left: '0px', top: '0px', width: '22px', height: '8px', borderRadius: '2px', background: '#c08a3e' }} />
              <div style={{ position: 'absolute', left: '4px', top: '10px', width: '22px', height: '8px', borderRadius: '2px', background: '#b14e2c' }} />
              <div style={{ position: 'absolute', left: '8px', top: '20px', width: '22px', height: '8px', borderRadius: '2px', background: '#241f18' }} />
            </div>
            <div
              style={{
                fontSize: '30px',
                fontWeight: 700,
                color: '#241f18',
                letterSpacing: '-0.025em',
              }}
            >
              Nexus
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: '76px',
              fontWeight: 700,
              color: '#241f18',
              letterSpacing: '-0.04em',
              lineHeight: '1.0',
              marginBottom: '30px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>A calm home for</span>
            <span>everything you know.</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '26px',
              color: 'rgba(36,31,24,0.52)',
              letterSpacing: '-0.01em',
              lineHeight: '1.4',
            }}
          >
            The knowledge workspace that keeps your team organised, always.
          </div>
        </div>

        {/* URL — bottom left */}
        <div
          style={{
            position: 'absolute',
            left: '88px',
            bottom: '52px',
            fontSize: '19px',
            color: 'rgba(36,31,24,0.32)',
            letterSpacing: '0.02em',
          }}
        >
          usenexus.app
        </div>
      </div>
    ),
    { ...size },
  );
}
