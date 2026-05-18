import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CounterpartyDashboard from '../CounterpartyDashboard';
import * as counterpartyApi from '../../lib/counterparty';

// Mocks
const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inn: '' }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../lib/cache', () => ({
  getCachedCheck: vi.fn().mockResolvedValue(null),
  saveCheckCache: vi.fn().mockResolvedValue(undefined),
}));

// Mock framer-motion to avoid animation issues in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: function MockMotionDiv({ children }: any) { return children; },
  },
  AnimatePresence: function MockAnimatePresence({ children }: any) { return children; },
}));

describe('CounterpartyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(counterpartyApi, 'checkRosstat').mockResolvedValue({
      success: false,
      company: { name: '', inn: '', ogrn: '' },
      reports: [],
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search form', () => {
    render(<CounterpartyDashboard />);
    expect(screen.getByPlaceholderText(/Введите ИНН компании/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Проверить/ })).toBeInTheDocument();
  });

  it('shows error for invalid INN', async () => {
    render(<CounterpartyDashboard />);
    const input = screen.getByPlaceholderText(/Введите ИНН компании/);
    const button = screen.getByRole('button', { name: /Проверить/ });

    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Введите корректный ИНН/)).toBeInTheDocument();
    });
  });

  it('performs search and shows results', async () => {
    const mockCheck = {
      inn: '7707083893',
      egrul: {
        success: true,
        data: {
          inn: '7707083893',
          name: 'ПАО СБЕРБАНК РОССИИ',
          fullName: 'Публичное акционерное общество "Сбербанк России"',
          ogrn: '1027700132195',
          kpp: '773601001',
          address: '117997, г. Москва, ул. Вавилова, д. 19',
          director: 'Греф Герман Оскарович',
          founder: 'Российская Федерация',
          capital: '100 000 000 000',
          okved: '64.19',
          status: 'Действующее',
          regDate: '01.06.1991',
        },
        raw: {},
      },
      fssp: { status: 'not_found' as const, count: 0, productions: [] },
      efrsb: { hasBankruptcy: false, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    vi.spyOn(counterpartyApi, 'checkCounterparty').mockResolvedValue(mockCheck as any);

    render(<CounterpartyDashboard />);
    const input = screen.getByPlaceholderText(/Введите ИНН компании/);
    const button = screen.getByRole('button', { name: /Проверить/ });

    fireEvent.change(input, { target: { value: '7707083893' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Сбербанк/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Греф Герман/)).toBeInTheDocument();
    expect(screen.getByText(/Действующее/)).toBeInTheDocument();
  });

  it('shows FSSP section with risk factor', async () => {
    const mockCheck = {
      inn: '1234567890',
      egrul: null,
      fssp: {
        status: 'found' as const,
        count: 2,
        productions: [
          { number: '12345/2026', date: '01.01.2026', sum: '500000', subject: 'Взыскание задолженности' },
        ],
      },
      efrsb: { hasBankruptcy: false, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    vi.spyOn(counterpartyApi, 'checkCounterparty').mockResolvedValue(mockCheck as any);

    render(<CounterpartyDashboard />);
    const input = screen.getByPlaceholderText(/Введите ИНН компании/);
    const button = screen.getByRole('button', { name: /Проверить/ });

    fireEvent.change(input, { target: { value: '1234567890' } });
    fireEvent.click(button);

    await waitFor(() => {
      // Section title is always visible
      expect(screen.getByRole('heading', { name: /Исполнительные производства/ })).toBeInTheDocument();
      // Risk score reflects FSSP data
      expect(screen.getByText(/Средний риск/)).toBeInTheDocument();
    });
  });

  it('shows bankruptcy warning in risk score and section title', async () => {
    const mockCheck = {
      inn: '1234567890',
      egrul: null,
      fssp: { status: 'not_found' as const, count: 0, productions: [] },
      efrsb: {
        hasBankruptcy: true,
        cases: [{ number: 'A40-123/2026', date: '01.01.2026', court: 'АС Москвы', status: 'Банкротство' }],
        registry: [],
      },
      timestamp: new Date().toISOString(),
    };

    vi.spyOn(counterpartyApi, 'checkCounterparty').mockResolvedValue(mockCheck as any);

    render(<CounterpartyDashboard />);
    const input = screen.getByPlaceholderText(/Введите ИНН компании/);
    const button = screen.getByRole('button', { name: /Проверить/ });

    fireEvent.change(input, { target: { value: '1234567890' } });
    fireEvent.click(button);

    await waitFor(() => {
      // EFRSB section title is always visible
      expect(screen.getByRole('heading', { name: /Банкротство/ })).toBeInTheDocument();
      // Risk score reflects bankruptcy (high risk)
      expect(screen.getByText(/Высокий риск/)).toBeInTheDocument();
    });
  });

  it('shows low risk score for clean company', async () => {
    const mockCheck = {
      inn: '1234567890',
      egrul: {
        success: true,
        data: { status: 'ACTIVE', capital: '1000000' },
        raw: {},
      },
      fssp: { status: 'not_found' as const, count: 0, productions: [] },
      efrsb: { hasBankruptcy: false, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    vi.spyOn(counterpartyApi, 'checkCounterparty').mockResolvedValue(mockCheck as any);

    render(<CounterpartyDashboard />);
    const input = screen.getByPlaceholderText(/Введите ИНН компании/);
    const button = screen.getByRole('button', { name: /Проверить/ });

    fireEvent.change(input, { target: { value: '1234567890' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Низкий риск/)).toBeInTheDocument();
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });

  it('shows export and report buttons after search', async () => {
    const mockCheck = {
      inn: '1234567890',
      egrul: {
        success: true,
        data: { status: 'ACTIVE', capital: '1000000' },
        raw: {},
      },
      fssp: { status: 'not_found' as const, count: 0, productions: [] },
      efrsb: { hasBankruptcy: false, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    vi.spyOn(counterpartyApi, 'checkCounterparty').mockResolvedValue(mockCheck as any);

    render(<CounterpartyDashboard />);
    const input = screen.getByPlaceholderText(/Введите ИНН компании/);
    const button = screen.getByRole('button', { name: /Проверить/ });

    fireEvent.change(input, { target: { value: '1234567890' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /HTML отчёт/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Экспорт/ })).toBeInTheDocument();
    });
  });
});
