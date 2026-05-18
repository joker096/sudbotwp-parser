import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TaxpayerCheck from '../TaxpayerCheck';
import * as npdApi from '../../lib/npd';
import * as counterpartyApi from '../../lib/counterparty';

// Mock SEO hook
vi.mock('../hooks/useSeo', () => ({
  useSeo: () => ({ setSeo: vi.fn() }),
}));

// Mock Toast hook
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('TaxpayerCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search form', () => {
    render(<TaxpayerCheck />);
    expect(screen.getByPlaceholderText(/000000000000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Проверить по всем базам/ })).toBeInTheDocument();
    expect(screen.getByText(/Проверка физического лица/)).toBeInTheDocument();
  });

  it('shows error for invalid INN length', async () => {
    render(<TaxpayerCheck />);
    const input = screen.getByPlaceholderText(/000000000000/);
    const button = screen.getByRole('button', { name: /Проверить по всем базам/ });

    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Введите ИНН/)).toBeInTheDocument();
    });
  });

  it('switches between tabs after search', async () => {
    const mockNpd = { status: true, message: 'Найден в реестре самозанятых', date: '2026-01-01' };
    const mockFssp = { status: 'not_found' as const, count: 0, productions: [] };
    const mockEfrsb = { hasBankruptcy: false, cases: [], registry: [] };
    const mockRosfin = { inList: false };

    vi.spyOn(npdApi, 'checkTaxpayerStatus').mockResolvedValue(mockNpd as any);
    vi.spyOn(counterpartyApi, 'checkFssp').mockResolvedValue(mockFssp as any);
    vi.spyOn(counterpartyApi, 'checkEfrsb').mockResolvedValue(mockEfrsb as any);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => mockRosfin,
    } as Response);

    render(<TaxpayerCheck />);
    const input = screen.getByPlaceholderText(/000000000000/);
    const button = screen.getByRole('button', { name: /Проверить по всем базам/ });

    fireEvent.change(input, { target: { value: '123456789012' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Долги/ })).toBeInTheDocument();
    });

    const fsspTab = screen.getByRole('button', { name: /Долги/ });
    fireEvent.click(fsspTab);
    expect(fsspTab).toHaveClass('text-accent');
  });

  it('performs check and shows NPD result', async () => {
    const mockNpd = { status: true, message: 'Найден в реестре самозанятых', date: '2026-01-01' };
    const mockFssp = { status: 'not_found' as const, count: 0, productions: [] };
    const mockEfrsb = { hasBankruptcy: false, cases: [], registry: [] };
    const mockRosfin = { inList: false };

    vi.spyOn(npdApi, 'checkTaxpayerStatus').mockResolvedValue(mockNpd as any);
    vi.spyOn(counterpartyApi, 'checkFssp').mockResolvedValue(mockFssp as any);
    vi.spyOn(counterpartyApi, 'checkEfrsb').mockResolvedValue(mockEfrsb as any);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => mockRosfin,
    } as Response);

    render(<TaxpayerCheck />);
    const input = screen.getByPlaceholderText(/000000000000/);
    const button = screen.getByRole('button', { name: /Проверить по всем базам/ });

    fireEvent.change(input, { target: { value: '123456789012' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Является самозанятым/)).toBeInTheDocument();
    });
  });

  it('shows FSSP results with debts', async () => {
    const mockNpd = { status: false, message: 'Не найден' };
    const mockFssp = {
      status: 'found' as const,
      count: 1,
      productions: [{ number: '123/2026', date: '01.01.2026', sum: '100000', subject: 'Долг' }],
    };
    const mockEfrsb = { hasBankruptcy: false, cases: [], registry: [] };
    const mockRosfin = { inList: false };

    vi.spyOn(npdApi, 'checkTaxpayerStatus').mockResolvedValue(mockNpd as any);
    vi.spyOn(counterpartyApi, 'checkFssp').mockResolvedValue(mockFssp as any);
    vi.spyOn(counterpartyApi, 'checkEfrsb').mockResolvedValue(mockEfrsb as any);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => mockRosfin,
    } as Response);

    render(<TaxpayerCheck />);
    const input = screen.getByPlaceholderText(/000000000000/);
    const button = screen.getByRole('button', { name: /Проверить по всем базам/ });

    fireEvent.change(input, { target: { value: '123456789012' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Долги/ })).toBeInTheDocument();
    });

    // Switch to FSSP tab
    fireEvent.click(screen.getByRole('button', { name: /Долги/ }));

    await waitFor(() => {
      expect(screen.getByText(/Найдено: 1 производств/)).toBeInTheDocument();
      expect(screen.getByText(/123\/2026/)).toBeInTheDocument();
    });
  });

  it('shows bankruptcy warning', async () => {
    const mockNpd = { status: false, message: 'Не найден' };
    const mockFssp = { status: 'not_found' as const, count: 0, productions: [] };
    const mockEfrsb = {
      hasBankruptcy: true,
      cases: [{ number: 'A40-123/2026', date: '01.01.2026', court: 'АС Москвы' }],
      registry: [],
    };
    const mockRosfin = { inList: false };

    vi.spyOn(npdApi, 'checkTaxpayerStatus').mockResolvedValue(mockNpd as any);
    vi.spyOn(counterpartyApi, 'checkFssp').mockResolvedValue(mockFssp as any);
    vi.spyOn(counterpartyApi, 'checkEfrsb').mockResolvedValue(mockEfrsb as any);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => mockRosfin,
    } as Response);

    render(<TaxpayerCheck />);
    const input = screen.getByPlaceholderText(/000000000000/);
    const button = screen.getByRole('button', { name: /Проверить по всем базам/ });

    fireEvent.change(input, { target: { value: '123456789012' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Банкротство/ })).toBeInTheDocument();
    });

    // Switch to EFRSB tab
    fireEvent.click(screen.getByRole('button', { name: /Банкротство/ }));

    await waitFor(() => {
      expect(screen.getByText(/A40-123\/2026/)).toBeInTheDocument();
    });
  });

  it('shows Rosfinmonitoring alert when in list', async () => {
    const mockNpd = { status: false, message: 'Не найден' };
    const mockFssp = { status: 'not_found' as const, count: 0, productions: [] };
    const mockEfrsb = { hasBankruptcy: false, cases: [], registry: [] };
    const mockRosfin = { inList: true, category: 'Террористы', details: 'В списке с 2020 г.' };

    vi.spyOn(npdApi, 'checkTaxpayerStatus').mockResolvedValue(mockNpd as any);
    vi.spyOn(counterpartyApi, 'checkFssp').mockResolvedValue(mockFssp as any);
    vi.spyOn(counterpartyApi, 'checkEfrsb').mockResolvedValue(mockEfrsb as any);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => mockRosfin,
    } as Response);

    render(<TaxpayerCheck />);
    const input = screen.getByPlaceholderText(/000000000000/);
    const button = screen.getByRole('button', { name: /Проверить по всем базам/ });

    fireEvent.change(input, { target: { value: '123456789012' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Росфинмониторинг/ })).toBeInTheDocument();
    });

    // Switch to Rosfin tab
    fireEvent.click(screen.getByRole('button', { name: /Росфинмониторинг/ }));

    await waitFor(() => {
      expect(screen.getByText(/Найден в списке!/)).toBeInTheDocument();
    });
  });
});
