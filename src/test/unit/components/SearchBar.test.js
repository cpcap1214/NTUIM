import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { SearchBar } from '../../../main/js/components/common';
import theme from '../../../main/js/theme';

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SearchBar Component', () => {
  test('renders with placeholder text', () => {
    renderWithTheme(
      <SearchBar 
        value="" 
        onChange={() => {}} 
        placeholder="搜尋課程..." 
      />
    );
    
    expect(screen.getByPlaceholderText('搜尋課程...')).toBeInTheDocument();
  });

  test('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    
    renderWithTheme(
      <SearchBar 
        value="" 
        onChange={mockOnChange} 
        placeholder="搜尋..." 
      />
    );
    
    const input = screen.getByPlaceholderText('搜尋...');
    fireEvent.change(input, { target: { value: '資料庫' } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  test('displays current value', () => {
    renderWithTheme(
      <SearchBar 
        value="現有搜尋內容" 
        onChange={() => {}} 
      />
    );
    
    expect(screen.getByDisplayValue('現有搜尋內容')).toBeInTheDocument();
  });

  test('includes search icon', () => {
    renderWithTheme(
      <SearchBar 
        value="" 
        onChange={() => {}} 
      />
    );
    
    // MUI 的 Search icon 會渲染為 SVG
    const searchIcon = document.querySelector('svg[data-testid="SearchIcon"]');
    expect(searchIcon).toBeInTheDocument();
  });
});