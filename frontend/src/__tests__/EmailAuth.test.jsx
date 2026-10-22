import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Register } from '../pages/auth/Register';
import { VerifyEmail } from '../pages/auth/VerifyEmail';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { Login } from '../pages/auth/Login';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({
  authService: {
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('Frontend Email Authentication & Password Recovery Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Register Component', () => {
    it('renders all registration fields including password confirmation', () => {
      render(
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <Register />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      );

      expect(screen.getByPlaceholderText('e.g. John Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Register & Verify Email/i })).toBeInTheDocument();
    });

    it('validates password match and shows check inbox screen on successful registration', async () => {
      authService.register.mockResolvedValue({
        data: {
          user: { name: 'Jane Doe', email: 'jane@example.com' },
          emailDelivered: true,
        },
      });

      render(
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <Register />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('e.g. John Doe'), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByRole('button', { name: /Register & Verify Email/i }));

      expect(await screen.findByText('Check Your Inbox')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend available in/i })).toBeInTheDocument();
    });
  });

  describe('VerifyEmail Component', () => {
    it('shows success screen when token verification succeeds', async () => {
      authService.verifyEmail.mockResolvedValue({
        data: { isEmailVerified: true },
      });

      render(
        <MemoryRouter initialEntries={['/verify-email?token=valid-test-token']}>
          <ToastProvider>
            <VerifyEmail />
          </ToastProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Email Verified Successfully!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In to Your Workspace/i })).toBeInTheDocument();
    });

    it('shows error screen and resend action when token is invalid or expired', async () => {
      authService.verifyEmail.mockRejectedValue(new Error('Invalid or expired verification token.'));

      render(
        <MemoryRouter initialEntries={['/verify-email?token=expired-test-token']}>
          <ToastProvider>
            <VerifyEmail />
          </ToastProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Verification Link Expired or Invalid')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
    });
  });

  describe('ForgotPassword Component', () => {
    it('submits email and displays confirmation notice without revealing account existence', async () => {
      authService.forgotPassword.mockResolvedValue({
        data: {},
      });

      render(
        <BrowserRouter>
          <ToastProvider>
            <ForgotPassword />
          </ToastProvider>
        </BrowserRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('patient@example.com'), { target: { value: 'user@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

      expect(await screen.findByText('Password Reset Request Received')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  describe('ResetPassword Component', () => {
    it('validates matching passwords and calls resetPassword service', async () => {
      authService.resetPassword.mockResolvedValue({
        data: {},
      });

      render(
        <MemoryRouter initialEntries={['/reset-password?token=sample-reset-token']}>
          <ToastProvider>
            <ResetPassword />
          </ToastProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Choose New Password')).toBeInTheDocument();

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      fireEvent.change(passwordInputs[0], { target: { value: 'NewSecret123!' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'NewSecret123!' } });

      fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));

      expect(await screen.findByText('Password Updated!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proceed to Sign In/i })).toBeInTheDocument();
    });
  });

  describe('Login Component Verification Banner', () => {
    it('displays email verification warning banner when login encounters EMAIL_NOT_VERIFIED', async () => {
      const error = new Error('Please verify your email address before signing in.');
      error.response = {
        data: {
          data: { code: 'EMAIL_NOT_VERIFIED' },
        },
      };
      authService.login.mockRejectedValue(error);

      render(
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <Login />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('patient@example.com'), { target: { value: 'unverified@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      expect(await screen.findByText('Email Verification Required')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
    });
  });
});
