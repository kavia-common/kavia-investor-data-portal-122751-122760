//
// PUBLIC_INTERFACE
export function getWatermarkText(email = '') {
  /**
   * Returns a simple watermark string containing user email and timestamp.
   * Intended for NDA document overlay.
   */
  const who = email || 'user@example.com';
  const when = new Date().toLocaleString();
  return `${who} • ${when}`;
}

/**
 * PUBLIC_INTERFACE
 * WatermarkOverlay
 *
 * A simple, brand-styled, non-interactive overlay that displays watermark text
 * over embedded content. This is a UI-only stub; in a future step you may replace
 * this with a repeated pattern or canvas-based watermark.
 */
export function WatermarkOverlay({ text = '' }) {
  const content = text || 'Confidential';
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'grid',
        placeItems: 'center',
        zIndex: 5,
      }}
    >
      <div
        style={{
          transform: 'rotate(-24deg)',
          fontSize: 26,
          lineHeight: 1.3,
          color: '#FFFFFF',
          opacity: 0.15,
          fontWeight: 700,
          letterSpacing: 0.6,
          padding: '10px 14px',
          borderRadius: 12,
          background:
            'linear-gradient(180deg, rgba(35,31,32,0.35), rgba(35,31,32,0.35))',
          border: '1px dashed rgba(255,255,255,0.12)',
          textAlign: 'center',
          maxWidth: '80%',
        }}
      >
        NDA — {content}
      </div>
    </div>
  );
}

export default {
  getWatermarkText,
  WatermarkOverlay,
};
