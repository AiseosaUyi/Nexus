import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Geometric "N" mark — must read crisply at small sizes. Built from primitive
// boxes + a parallelogram so satori/next-og renders it identically across
// systems regardless of installed fonts.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0a0a',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* left vertical stroke */}
        <div
          style={{
            position: 'absolute',
            left: 45,
            top: 39,
            width: 23,
            height: 102,
            background: '#ffffff',
          }}
        />
        {/* right vertical stroke */}
        <div
          style={{
            position: 'absolute',
            right: 45,
            top: 39,
            width: 23,
            height: 102,
            background: '#ffffff',
          }}
        />
        {/* diagonal — rotated rectangle */}
        <div
          style={{
            position: 'absolute',
            left: 67,
            top: 38,
            width: 23,
            height: 117,
            background: '#ffffff',
            transform: 'rotate(35deg)',
            transformOrigin: 'top left',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
