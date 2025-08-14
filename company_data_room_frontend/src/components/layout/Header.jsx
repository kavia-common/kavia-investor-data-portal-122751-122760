import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Header renders a minimal top navigation bar with KAVIA branding and a theme toggle.
 *
 * Props:
 * - theme: 'light' | 'dark' — current theme mode
 * - toggleTheme: () => void — toggles between light and dark themes
 *
 * Accessibility:
 * - Uses role="banner" on header
 * - Theme toggle button has ARIA label describing action
 */
const brandColors = {
  primary: '#0057B8',  // Kavia Blue
  accent: '#FFD700',   // Kavia Gold
  secondary: '#282C34' // Dark Slate
};

// PUBLIC_INTERFACE
export default function Header({ theme, toggleTheme }) {
  return (
    <header
      role="banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: `2px solid ${brandColors.accent}`,
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          aria-label="KAVIA logo"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: brandColors.primary,
            display: 'inline-block',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        />
        <strong style={{ color: 'var(--text-primary)' }}>KAVIA Investor Data Room</strong>
      </div>

      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{
          backgroundColor: brandColors.primary,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </header>
  );
}
