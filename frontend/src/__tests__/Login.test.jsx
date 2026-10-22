import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../pages/auth/Login';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

describe('Login Component Tests', () => {
  it('renders login form and development-only role demo buttons', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('patient@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();

    if (import.meta.env.DEV) {
      expect(screen.getByRole('button', { name: 'Use Patient demo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Use Doctor demo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Use CHO demo' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Use Admin demo' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Use Doctor demo' }));
      expect(screen.getByPlaceholderText('patient@example.com')).toHaveValue('doctor@example.com');
      expect(screen.getByPlaceholderText('••••••••')).toHaveValue('MedScanDemo!2026');
    }
  });
});
