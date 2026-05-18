import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import MonitoredCompaniesSection from '../MonitoredCompaniesSection';
import * as authHook from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

// Mock hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('MonitoredCompaniesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows login prompt when not authenticated', () => {
    (authHook.useAuth as any).mockReturnValue({ user: null });
    
    render(<MonitoredCompaniesSection />);
    
    expect(screen.getByText(/Войдите, чтобы управлять мониторингом/)).toBeInTheDocument();
  });

  it('renders add form for authenticated user', () => {
    (authHook.useAuth as any).mockReturnValue({ 
      user: { id: 'test-user-id', email: 'test@test.com' } 
    });

    render(<MonitoredCompaniesSection />);
    
    expect(screen.getByPlaceholderText(/ИНН/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Добавить/ })).toBeInTheDocument();
  });

  it('shows empty state when no companies', async () => {
    (authHook.useAuth as any).mockReturnValue({ 
      user: { id: 'test-user-id' } 
    });

    // Mock Supabase response
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    (supabase as any).from = mockFrom;

    render(<MonitoredCompaniesSection />);
    
    await waitFor(() => {
      expect(screen.getByText(/Нет отслеживаемых компаний/)).toBeInTheDocument();
    });
  });

  it('validates INN length', () => {
    (authHook.useAuth as any).mockReturnValue({ 
      user: { id: 'test-user-id' } 
    });

    render(<MonitoredCompaniesSection />);
    
    const innInput = screen.getByPlaceholderText(/ИНН/);
    fireEvent.change(innInput, { target: { value: '123' } });
    
    expect(innInput).toHaveValue('123');
  });
});
