import React from 'react';
import { NavLink } from 'react-router-dom';
import kaviaLogo from '../../assets/brand/kavia_logo.svg';

/**
 * PUBLIC_INTERFACE
 * Sidebar provides the main navigation for the app with KAVIA brand styling,
 * including responsive mobile behavior (slide-in with overlay).
 *
 * Props:
 * - isOpen?: boolean — whether the sidebar is open on mobile
 * - onClose?: () => void — callback used to close the sidebar (overlay click)
 *
 * Links (stubs for now):
 * - Home (/), Dashboard (/dashboard), Documents (/documents), NDA (/nda),
 *   Notifications (/notifications), Admin (/admin), About (/about), Login (/login)
 *
 * Styling (brand):
 * - Background: var(--bg-primary) [#231F20]
 * - Text: var(--text-primary) [#FFFFFF], secondary rgba(255,255,255,0.70)
 * - Border: var(--border-color) [#3A3533]
 * - Active item: subtle brand highlight (bg var(--surface-elevated) and left border in brand)
 */
// PUBLIC_INTERFACE
export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const linkBaseStyle = {
    display: 'block',
    padding: '0.6rem 0.7rem',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    letterSpacing: 0.2,
    transition: 'background 0.2s ease, color 0.2s ease, opacity 0.2s ease',
  };

  const getLinkStyle = ({ isActive }) => ({
    ...linkBaseStyle,
    color: isActive ? 'var(--text-primary)' : 'rgba(255,255,255,0.9)',
    background: isActive ? 'var(--surface-elevated)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--brand-primary)' : '3px solid transparent',
    paddingLeft: isActive ? '0.55rem' : '0.7rem',
  });

  const getFaintLinkStyle = ({ isActive }) => ({
    ...linkBaseStyle,
    color: isActive ? 'var(--text-primary)' : 'rgba(255,255,255,0.70)',
    background: isActive ? 'var(--surface-elevated)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--brand-primary)' : '3px solid transparent',
    paddingLeft: isActive ? '0.55rem' : '0.7rem',
    opacity: isActive ? 1 : 0.95,
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          role="button"
          aria-label="Close navigation"
          tabIndex={0}
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        className={`sidebar ${isOpen ? 'open' : ''}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.25rem 0.25rem 0.75rem' }}>
          <img
            src={kaviaLogo}
            alt="KAVIA mark"
            width={24}
            height={24}
            style={{ display: 'block' }}
          />
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: 12,
            letterSpacing: 0.3,
            textTransform: 'uppercase'
          }}>
            Navigation
          </div>
        </div>

        <nav aria-label="Main navigation" style={{ display: 'grid', gap: '0.55rem' }}>
          <NavLink to="/" end style={getLinkStyle}>
            Home
          </NavLink>
          <NavLink to="/dashboard" style={getLinkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/documents" style={getFaintLinkStyle}>
            Documents
          </NavLink>
          <NavLink to="/nda" style={getFaintLinkStyle}>
            NDA &amp; Access
          </NavLink>
          <NavLink to="/notifications" style={getFaintLinkStyle}>
            Notifications
          </NavLink>
          <NavLink to="/admin" style={getFaintLinkStyle}>
            Admin
          </NavLink>

          <div
            style={{
              padding: '0.6rem 0.25rem 0.25rem',
              marginTop: '0.35rem',
              borderTop: `1px dashed rgba(255,255,255,0.12)`,
              color: 'var(--text-secondary)',
              fontSize: 12,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            Info
          </div>
          <NavLink to="/about" style={getLinkStyle}>
            About
          </NavLink>
          <NavLink to="/login" style={getFaintLinkStyle}>
            Login
          </NavLink>
        </nav>
      </aside>
    </>
  );
}
