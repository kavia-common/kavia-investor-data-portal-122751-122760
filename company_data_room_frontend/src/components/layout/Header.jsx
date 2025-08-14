import React from 'react';
import wordmark from '../../assets/brand/wordmark_logo.svg';

/**
 * PUBLIC_INTERFACE
 * Header renders a KAVIA-branded top navigation bar with wordmark, theme toggle,
 * and a mobile menu button to open the Sidebar.
 *
 * Props:
 * - theme: 'light' | 'dark' — current theme mode
 * - toggleTheme: () => void — toggles between light and dark themes
 * - onMenuToggle?: () => void — toggles the sidebar on small screens
 *
 * Accessibility:
 * - Uses role="banner" on header
 * - Theme toggle button has ARIA label describing action
 * - Mobile menu button is min 44x44 and has an accessible label
 */
// PUBLIC_INTERFACE
export default function Header({ theme, toggleTheme, onMenuToggle }) {
  return (
    <header
      role="banner"
      className="header-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Wordmark */}
        <img
          src={wordmark}
          alt="KAVIA AI"
          style={{
            width: 138,
            height: 34,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          style={{ whiteSpace: 'nowrap' }}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </header>
  );
}
