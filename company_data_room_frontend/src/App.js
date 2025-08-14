import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

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
