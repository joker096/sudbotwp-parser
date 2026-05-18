import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CityAutocomplete from '../CityAutocomplete';

describe('CityAutocomplete', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input with placeholder', () => {
    render(<CityAutocomplete value="" onChange={mockOnChange} />);
    expect(screen.getByPlaceholderText('Начните вводить город...')).toBeInTheDocument();
  });

  it('shows dropdown when focused', async () => {
    render(<CityAutocomplete value="" onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText('Начните вводить город...');
    
    fireEvent.focus(input);
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('filters cities when typing', async () => {
    render(<CityAutocomplete value="" onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText('Начните вводить город...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Моск' } });
    
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  it('selects city on click', async () => {
    render(<CityAutocomplete value="" onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText('Начните вводить город...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Астра' } });
    
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });
    
    // Click the first option
    const firstOption = screen.getAllByRole('option')[0];
    fireEvent.click(firstOption);
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  it('shows "Город не найден" for invalid query', async () => {
    render(<CityAutocomplete value="" onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText('Начните вводить город...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'XYZ123' } });
    
    await waitFor(() => {
      expect(screen.getByText('Город не найден')).toBeInTheDocument();
    });
  });

  it('clears input when clear button clicked', async () => {
    render(<CityAutocomplete value="Москва" onChange={mockOnChange} />);
    
    const clearBtn = screen.getByLabelText('Очистить');
    fireEvent.click(clearBtn);
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  it('navigates with keyboard arrows', async () => {
    render(<CityAutocomplete value="" onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText('Начните вводить город...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'А' } });
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });
});
