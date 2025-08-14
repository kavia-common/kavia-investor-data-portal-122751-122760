import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, NavLink } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AuthProvider } from './context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * Header renders a minimal top bar for the application.
 * Includes:
 *  - Brand/title placeholder
 *  - Theme toggle
 */
function Header({ theme, toggleTheme }) {
  return (
    <header
      role="banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          aria-label="Application logo placeholder"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'var(--text-secondary)',
            display: 'inline-block',
          }}
        />
        <strong style={{ color: 'var(--text-primary)' }}>KAVIA Investor Data Room</strong>
      </div>

      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </header>
  );
}

/**
 * PUBLIC_INTERFACE
 * Sidebar is a minimal navigation stub. It provides placeholder nav links and
 * serves as the left-side navigation for the main layout.
 */
function Sidebar() {
  return (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: 220,
        borderRight: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <nav aria-label="Main navigation">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
          <li>
            <NavLink to="/" end className="App-link">
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard" className="App-link">
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" className="App-link">
              About
            </NavLink>
          </li>

          {/* Future navigation stubs */}
          <li style={{ marginTop: '1rem', opacity: 0.7 }}>
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Coming soon</span>
          </li>
          <li style={{ opacity: 0.7 }}>
            <span className="App-link" aria-disabled="true">Documents</span>
          </li>
          <li style={{ opacity: 0.7 }}>
            <span className="App-link" aria-disabled="true">NDA & Access</span>
          </li>
          <li style={{ opacity: 0.7 }}>
            <span className="App-link" aria-disabled="true">Notifications</span>
          </li>
          <li style={{ opacity: 0.7 }}>
            <span className="App-link" aria-disabled="true">Admin</span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

/**
 * PUBLIC_INTERFACE
 * MainLayout composes the Sidebar and Header around the main page content.
 * It is a thin shell to wrap routed pages with baseline frame components.
 */
function MainLayout({ children, theme, toggleTheme }) {
  return (
    <div
      className="app-shell"
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <Sidebar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Header theme={theme} toggleTheme={toggleTheme} />
        <main
          className="page-content"
          role="main"
          style={{ padding: '1.25rem', flex: 1, minWidth: 0 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * App is the root component of the application. It provides:
 * - Theme toggle (light/dark) using a data-theme attribute on the HTML element.
 * - BrowserRouter setup.
 * - AuthProvider wrapping to ensure all routes are within authenticated context.
 * - MainLayout shell (Header + Sidebar) wrapping routed content.
 */
function App() {
  const [theme, setTheme] = useState('light');

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /**
   * PUBLIC_INTERFACE
   * Toggles the application theme between light and dark.
   */
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="App">
      {/* Ensure all routes are nested within AuthProvider */}
      <AuthProvider>
        <BrowserRouter>
          <MainLayout theme={theme} toggleTheme={toggleTheme}>
            <AppRoutes />
          </MainLayout>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
