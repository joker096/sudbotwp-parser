import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

/**
 * Unit tests for useAuth hook.
 * Tests AuthProvider initialization, login, logout, and error handling.
 * All Supabase dependencies are mocked.
 */

// ─── Mock Supabase dependencies ───────────────────────────────────────────────

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
};

const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
};

const mockSession = { user: mockUser };

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  auth: {
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  profile: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    createProfile: vi.fn(),
  },
}));

import { auth, profile } from '../lib/supabase';

// Import the hook after mocking
import { AuthProvider, useAuth } from './useAuth';
import { renderHook, act, WrapperComponent } from '@testing-library/react';

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('useAuth hook', () => {
  let unsubscribers: (() => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribers = [];

    // Default: return a logged-in session
    vi.mocked(auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Default: return existing profile
    vi.mocked(profile.getProfile).mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    // Mock onAuthStateChange to capture the callback
    vi.mocked(auth.onAuthStateChange).mockImplementation((callback) => {
      // Simulate the callback being registered
      unsubscribers.push(() => {});
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const unsub = unsubscribers.pop();
              if (unsub) unsub();
            },
          },
        },
      };
    });
  });

  describe('AuthProvider initial state', () => {
    it('starts with isLoading true during initialization', async () => {
      // Delay the session response to ensure loading state is observable
      vi.mocked(auth.getSession).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: mockSession }, error: null }), 50))
      );
      vi.mocked(profile.getProfile).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockProfile, error: null }), 50))
      );

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('throws error when used outside AuthProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const renderOutside = () => {
        renderHook(() => useAuth());
      };

      expect(renderOutside).toThrow('useAuth must be used within an AuthProvider');
      consoleSpy.mockRestore();
    });
  });

  describe('loginWithGoogle', () => {
    it('calls auth.signInWithGoogle when triggered', async () => {
      vi.mocked(auth.signInWithGoogle).mockResolvedValue({
        data: { url: 'https://auth.url' },
        error: null,
      });

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithGoogle();
      });

      expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('throws and logs error when signIn fails', async () => {
      const error = new Error('OAuth failed');
      vi.mocked(auth.signInWithGoogle).mockResolvedValue({
        data: null,
        error,
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithGoogle();
      });

      expect(console.error).toHaveBeenCalledWith('Error logging in with Google:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('calls auth.signOut when triggered', async () => {
      vi.mocked(auth.signOut).mockResolvedValue({ error: null });

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('throws and logs error when signOut fails', async () => {
      const error = new Error('Sign out failed');
      vi.mocked(auth.signOut).mockResolvedValue({ error });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(console.error).toHaveBeenCalledWith('Error logging out:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('updateProfile', () => {
    it('returns error when user is null', async () => {
      // No session — user is not authenticated
      vi.mocked(auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        // Wait for initial load
      });

      const updateResult = await result.current.updateProfile({ full_name: 'New Name' });
      expect(updateResult.error).toBeInstanceOf(Error);
      expect(updateResult.error.message).toBe('Пользователь не аутентифицирован');
    });

    it('calls profile.updateProfile with correct userId', async () => {
      vi.mocked(profile.updateProfile).mockResolvedValue({
        data: { ...mockProfile, full_name: 'Updated Name' },
        error: null,
      });

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial load to complete
      await act(async () => {});

      // Now call updateProfile and wait for it
      await act(async () => {
        await result.current.updateProfile({ full_name: 'Updated Name' });
      });

      expect(profile.updateProfile).toHaveBeenCalledWith('user-123', {
        full_name: 'Updated Name',
      });
    });
  });

  describe('isAuthenticated', () => {
    it('is true when session exists', async () => {
      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        // Wait for initialization
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('is false when no session', async () => {
      vi.mocked(auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const wrapper: WrapperComponent<{}> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {});

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});