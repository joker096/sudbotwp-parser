import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

// ─── Mock dependencies ───────────────────────────────────────────────────────

let mockProfileData: any = null;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, profileData: mockProfileData }),
}));

vi.mock('../../hooks/useSeo', () => ({
  useSeo: () => ({ setSeo: vi.fn() }),
}));

vi.mock('../../lib/supabase', () => {
  const mockGetActive = vi.fn();
  const mockGetIds = vi.fn();
  const mockCheckLimit = vi.fn();
  const mockTrackView = vi.fn();
  const mockGetSession = vi.fn();

  return {
    lawyers: { getActive: mockGetActive },
    lawyerFavorites: {
      getIds: mockGetIds,
      add: vi.fn(),
      remove: vi.fn(),
    },
    lawyerViewLimits: {
      checkLimit: mockCheckLimit,
      trackView: mockTrackView,
    },
    supabase: {
      auth: {
        getSession: mockGetSession,
      },
    },
  };
});

vi.mock('../../components/LeadModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="lead-modal">LeadModal</div> : null,
}));

vi.mock('../../components/StarRating', () => ({
  default: () => <span data-testid="star-rating">★</span>,
}));

vi.mock('../../components/SafeLink', () => ({
  default: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href} data-testid="safe-link">{children}</a>
  ),
}));

vi.mock('../../components/AdBanner', () => ({
  default: () => <div data-testid="ad-banner">Ad</div>,
}));

// Import after mocks
import Lawyers from '../Lawyers';
import { lawyers, lawyerFavorites, lawyerViewLimits, supabase } from '../../lib/supabase';

const mockLawyers = [
  {
    id: 'lawyer-1',
    name: 'Иван Иванов',
    spec: 'Гражданские',
    city: 'Москва',
    region: 'Москва и Московская область',
    rating: 4.9,
    reviews: 12,
    verified: true,
    experience: '10',
    experience_years: 10,
    phone: '+79990000001',
    email: 'ivan@example.com',
    website: 'https://ivan-lawyer.ru',
    telegram: '@ivanlawyer',
    license_number: '77-1234',
    practice_areas: ['Жилищное право', 'Семейное право'],
    languages: ['Русский', 'Английский'],
    description: 'Опытный юрист по гражданским делам.',
    avatar_url: null,
    img: null,
  },
  {
    id: 'lawyer-2',
    name: 'Петр Петров',
    spec: 'Уголовные',
    city: 'Санкт-Петербург',
    region: 'Санкт-Петербург и Ленинградская область',
    rating: 4.5,
    reviews: 5,
    verified: false,
    experience: '5',
    experience_years: 5,
    phone: '+79990000002',
    email: null,
    website: null,
    telegram: null,
    license_number: null,
    practice_areas: [],
    languages: [],
    description: 'Юрист по уголовным делам.',
    avatar_url: null,
    img: null,
  },
];

describe('Lawyers page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileData = null;
    vi.mocked(lawyers.getActive).mockResolvedValue({ data: mockLawyers, error: null });
    vi.mocked(lawyerFavorites.getIds).mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(lawyerViewLimits.checkLimit).mockResolvedValue({ hasLimit: false, remaining: 5 });
    vi.mocked(lawyerViewLimits.trackView).mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <Lawyers />
      </MemoryRouter>
    );

  it('renders heading and search input', async () => {
    renderWithRouter();
    expect(screen.getByText('Юристы')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Поиск по ФИО или городу...')).toBeInTheDocument();
    await waitFor(() => expect(lawyers.getActive).toHaveBeenCalled());
  });

  it('renders list of lawyers after loading', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Петр Петров')).toBeInTheDocument();
  });

  it('filters lawyers by search query', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    const input = screen.getByPlaceholderText('Поиск по ФИО или городу...');
    fireEvent.change(input, { target: { value: 'Петр' } });

    await waitFor(() => {
      expect(screen.queryByText('Иван Иванов')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Петр Петров')).toBeInTheDocument();
  });

  it('opens lawyer modal on click', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Иван Иванов')[0]);

    await waitFor(() => {
      expect(screen.getByText('Написать сообщение')).toBeInTheDocument();
    });
  });

  it('shows contacts always in modal', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Иван Иванов')[0]);

    await waitFor(() => {
      expect(screen.getByText('+79990000001')).toBeInTheDocument();
      expect(screen.getByText('ivan@example.com')).toBeInTheDocument();
    });
  });

  it('shows subscription prompt for anonymous users clicking "Показать данные"', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Иван Иванов')[0]);
    await waitFor(() => expect(screen.getByText('Показать данные')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Показать данные'));
    });

    await waitFor(() => {
      expect(screen.getByText('Полные данные доступны по подписке.')).toBeInTheDocument();
      expect(screen.getByText('Приобрести подписку')).toBeInTheDocument();
    });

    expect(screen.queryByText('Скрыть данные')).not.toBeInTheDocument();
  });

  it('clicking "Скрыть данные" hides extra data', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Иван Иванов')[0]);
    await waitFor(() => expect(screen.getByText('Показать данные')).toBeInTheDocument());

    // Mock authenticated user with views remaining
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Показать данные'));
    });
    await waitFor(() => expect(screen.getByText('Скрыть данные')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Скрыть данные'));

    await waitFor(() => {
      expect(screen.getByText('Показать данные')).toBeInTheDocument();
    });
    expect(screen.queryByText('Скрыть данные')).not.toBeInTheDocument();
  });

  it('shows limit reached message for regular users when view limit exceeded', async () => {
    vi.mocked(lawyerViewLimits.checkLimit).mockResolvedValue({ hasLimit: true, remaining: 0 });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    });

    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Иван Иванов')[0]);
    await waitFor(() => expect(screen.getByText('Показать данные')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Показать данные'));
    });

    await waitFor(() => {
      expect(screen.getByText('Полные данные доступны по подписке.')).toBeInTheDocument();
      expect(screen.getByText('Приобрести подписку')).toBeInTheDocument();
    });
  });

  it('admin sees extra data without limits', async () => {
    mockProfileData = { role: 'admin' };

    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Иван Иванов')[0]);
    await waitFor(() => expect(screen.getByText('Показать данные')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Показать данные'));
    });

    await waitFor(() => {
      expect(screen.getByText('Скрыть данные')).toBeInTheDocument();
      expect(screen.getAllByText('Опытный юрист по гражданским делам.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('@ivanlawyer')).toBeInTheDocument();
    });

    expect(screen.queryByText('Полные данные доступны по подписке.')).not.toBeInTheDocument();
  });

  it('closes modal and resets state', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Иван Иванов')[0]);
    await waitFor(() => expect(screen.getByText('Написать сообщение')).toBeInTheDocument());

    const closeBtn = screen.getByLabelText('Закрыть');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Написать сообщение')).not.toBeInTheDocument();
    });
  });
});
