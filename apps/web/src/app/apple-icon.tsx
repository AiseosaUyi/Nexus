import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// "Blocks" mark — three cascading rounded blocks (gold · clay · paper) on ink.
// Built from primitive boxes so next-og renders it identically everywhere.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#241f18',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: 30, top: 50, width: 96, height: 30, borderRadius: 11, background: '#d9a85a' }} />
        <div style={{ position: 'absolute', left: 42, top: 88, width: 96, height: 30, borderRadius: 11, background: '#df7d45' }} />
        <div style={{ position: 'absolute', left: 54, top: 126, width: 96, height: 30, borderRadius: 11, background: '#f4efe3' }} />
      </div>
    ),
    { ...size },
  );
}
