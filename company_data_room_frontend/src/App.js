import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, NavLink } from 'react-router-dom';
import { AppRoutes } from './routes';

/**
 * PUBLIC_INTERFACE
 * App is the root component of the application. It provides:
 * - Theme toggle (light/dark) using a data-theme attribute on the HTML element.
 * - BrowserRouter setup and simple navigation to demonstrate routing.
 * - Rendering of route elements via AppRoutes.
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
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App">
      <BrowserRouter>
        <header className="App-header">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }} aria-label="Main navigation">
            <NavLink to="/" end className="App-link">Home</NavLink>
            <NavLink to="/dashboard" className="App-link">Dashboard</NavLink>
            <NavLink to="/about" className="App-link">About</NavLink>
          </nav>

          <AppRoutes />
        </header>
      </BrowserRouter>
    </div>
  );
}

export default App;
