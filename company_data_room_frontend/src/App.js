import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

/**
 * PUBLIC_INTERFACE
 * MainLayout composes the Sidebar and Header around the main page content,
 * and manages the responsive sidebar open/close state on small screens.
 *
 * Props:
 * - theme: 'light' | 'dark'
 * - toggleTheme: () => void
 */
function MainLayout({ children, theme, toggleTheme }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);

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
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Header theme={theme} toggleTheme={toggleTheme} onMenuToggle={toggleSidebar} />
        <main
          className="page-content"
          role="main"
          style={{ padding: '1.25rem', flex: 1, minWidth: 0 }}
          onClick={closeSidebar}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * App is the root component of the application.
 */
function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="App">
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
