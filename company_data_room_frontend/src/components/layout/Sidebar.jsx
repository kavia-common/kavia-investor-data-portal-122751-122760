import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * Sidebar provides the main navigation for the app with branded styling.
 *
 * Links (stubs for now):
 * - Home (/)
 * - Dashboard (/dashboard)
 * - Documents (/documents)
 * - NDA & Access (/nda)
 * - Notifications (/notifications)
 * - Admin (/admin)
 * - About (/about)
 * - Login (/login)
 *
 * Styling:
 * - Uses KAVIA brand colors with a minimal, modern layout
 * - Light theme overall, with a dark sidebar for contrast
 */
const brandColors = {
  primary: '#0057B8',  // Kavia Blue
  accent: '#FFD700',   // Kavia Gold
  secondary: '#282C34' // Dark Slate
};

// PUBLIC_INTERFACE
export default function Sidebar() {
  const linkBaseStyle = {
    display: 'block',
    padding: '0.55rem 0.65rem',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    letterSpacing: 0.2,
    transition: 'background 0.2s ease, color 0.2s ease',
  };

  const getLinkStyle = ({ isActive }) => ({
    ...linkBaseStyle,
    color: isActive ? brandColors.secondary : 'rgba(255,255,255,0.9)',
    background: isActive ? brandColors.accent : 'transparent',
  });

  const getFaintLinkStyle = ({ isActive }) => ({
    ...linkBaseStyle,
    color: isActive ? brandColors.secondary : 'rgba(255,255,255,0.65)',
    background: isActive ? brandColors.accent : 'transparent',
    opacity: isActive ? 1 : 0.9,
  });

  return (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: 240,
        borderRight: `1px solid rgba(0,0,0,0.08)`,
        backgroundColor: brandColors.secondary,
        padding: '1rem',
        boxSizing: 'border-box',
        color: '#ffffff',
      }}
    >
      <nav aria-label="Main navigation" style={{ display: 'grid', gap: '0.6rem' }}>
        <div
          style={{
            padding: '0.25rem 0.35rem 0.75rem',
            marginBottom: '0.35rem',
            borderBottom: `1px dashed rgba(255,255,255,0.12)`,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          Navigation
        </div>

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
            padding: '0.75rem 0.35rem 0.25rem',
            marginTop: '0.35rem',
            borderTop: `1px dashed rgba(255,255,255,0.12)`,
            color: 'rgba(255,255,255,0.7)',
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
  );
}
