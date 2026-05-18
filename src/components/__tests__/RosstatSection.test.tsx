import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RosstatSection from '../RosstatSection';

describe('RosstatSection', () => {
  it('renders financial chart and ratios', () => {
    const mockData = {
      success: true,
      company: { name: 'Test', inn: '123', ogrn: '123' },
      reports: [
        { year: 2023, period: 'годовой', assets: 1000000, liabilities: 500000, capital: 500000, revenue: 2000000, profit: 200000, expenses: 1500000, receivables: 100000, payables: 200000 },
      ],
    };

    render(<RosstatSection data={mockData} />);
    expect(screen.getByText(/Рентабельность/)).toBeInTheDocument();
    expect(screen.getByText(/Ликвидность/)).toBeInTheDocument();
    expect(screen.getByText(/Долг/)).toBeInTheDocument();
  });

  it('shows debt warning for high payables', () => {
    const mockData = {
      success: true,
      company: { name: 'Test', inn: '123', ogrn: '123' },
      reports: [
        { year: 2023, period: 'годовой', assets: 1000000, liabilities: 900000, capital: 100000, revenue: 500000, profit: 50000, expenses: 400000, receivables: 50000, payables: 800000 },
      ],
    };

    render(<RosstatSection data={mockData} />);
    expect(screen.getByText(/Высокая доля кредиторской задолженности/)).toBeInTheDocument();
  });

  it('renders multiple years', () => {
    const mockData = {
      success: true,
      company: { name: 'Test', inn: '123', ogrn: '123' },
      reports: [
        { year: 2021, period: 'годовой', assets: 500000, liabilities: 200000, capital: 300000, revenue: 1000000, profit: 100000, expenses: 800000, receivables: 50000, payables: 100000 },
        { year: 2022, period: 'годовой', assets: 750000, liabilities: 300000, capital: 450000, revenue: 1500000, profit: 150000, expenses: 1200000, receivables: 75000, payables: 150000 },
        { year: 2023, period: 'годовой', assets: 1000000, liabilities: 500000, capital: 500000, revenue: 2000000, profit: 200000, expenses: 1500000, receivables: 100000, payables: 200000 },
      ],
    };

    render(<RosstatSection data={mockData} />);
    // Должны отображаться карточки за последние 3 года
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
  });
});
