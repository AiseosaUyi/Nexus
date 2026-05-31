import { ImageResponse } from 'next/og';

export const alt = 'Nexus — A calm home for everything you know';
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
          background: '#f2ede2',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle dot-grid texture approximation — very faint repeating dots */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(36,31,24,0.06) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* ── Large decorative blocks (right side, partially cropped) ── */}
        {/* Block 1 — gold */}
        <div
          style={{
            position: 'absolute',
            left: 920,
            top: 82,
            width: 340,
            height: 110,
            borderRadius: 20,
            background: '#c08a3e',
          }}
        />
        {/* Block 2 — clay */}
        <div
          style={{
            position: 'absolute',
            left: 966,
            top: 210,
            width: 340,
            height: 110,
            borderRadius: 20,
            background: '#b14e2c',
          }}
        />
        {/* Block 3 — ink */}
        <div
          style={{
            position: 'absolute',
            left: 1012,
            top: 338,
            width: 340,
            height: 110,
            borderRadius: 20,
            background: '#241f18',
          }}
        />

        {/* Soft warm glow behind blocks */}
        <div
          style={{
            position: 'absolute',
            right: -80,
            top: 80,
            width: 600,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(192,138,62,0.15) 0%, transparent 70%)',
          }}
        />

        {/* ── Left content ── */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 0,
            bottom: 0,
            width: 820,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 0,
          }}
        >
          {/* Logo lockup */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 52,
            }}
          >
            {/* Blocks mark — 3 cascading rects */}
            <div style={{ position: 'relative', width: 36, height: 30, display: 'flex' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 24,
                  height: 9,
                  borderRadius: 3,
                  background: '#c08a3e',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 4,
                  top: 11,
                  width: 24,
                  height: 9,
                  borderRadius: 3,
                  background: '#b14e2c',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 22,
                  width: 24,
                  height: 9,
                  borderRadius: 3,
                  background: '#241f18',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: '#241f18',
                letterSpacing: '-0.025em',
              }}
            >
              Nexus
            </div>
          </div>

          {/* Main headline */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#241f18',
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              marginBottom: 28,
            }}
          >
            A calm home for<br />everything you know.
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 26,
              color: 'rgba(36,31,24,0.55)',
              letterSpacing: '-0.01em',
              lineHeight: 1.4,
              maxWidth: 580,
            }}
          >
            The knowledge workspace that keeps your team organised, always.
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            bottom: 52,
            fontSize: 20,
            color: 'rgba(36,31,24,0.35)',
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
