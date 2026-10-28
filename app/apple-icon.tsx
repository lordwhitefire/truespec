import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * The Apple touch icon. A plain "TS" mark on the site's dark surface and gold; no new logo is
 * invented beyond the mark the generated social card already uses.
 */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#101214',
        color: '#c8a24a',
        fontSize: 74,
        fontWeight: 700,
        letterSpacing: -3,
        fontFamily: 'sans-serif',
      }}
    >
      TS
    </div>,
    { ...size }
  );
}
