import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/lib/site';

export const alt = `${SITE_NAME} — cars you can trust`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const gold = '#c8a24a';
const ink = '#101214';
const paper = '#f5f1e6';
const muted = '#a9b0b5';
const line = '#2a2f33';

const host = SITE_ORIGIN.replace(/^https?:\/\//, '');

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: ink,
        padding: '72px',
        color: paper,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: 76,
            height: 76,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 18,
            backgroundColor: gold,
            color: ink,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          TS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24 }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }}>
            TrueSpec
          </div>
          <div style={{ fontSize: 20, color: gold, letterSpacing: 5, marginTop: 4 }}>
            AUTOMOTIVE
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
          Cars you can trust.
        </div>
        <div style={{ fontSize: 30, color: muted, lineHeight: 1.35, marginTop: 24, maxWidth: 920 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `2px solid ${line}`,
          paddingTop: 28,
        }}
      >
        <div style={{ fontSize: 24, color: gold }}>{host}</div>
        <div style={{ fontSize: 24, color: muted }}>Lagos · Nigeria</div>
      </div>
    </div>,
    { ...size }
  );
}
