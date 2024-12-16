import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import { ThemeMode } from '../../types/theme.types';
import Icon from './Icon';
import useTheme from '../../hooks/useTheme';
import styled from '@emotion/styled'; // v11.x

// Constants for component sizing and animation
const DROPDOWN_SIZES = {
  small: '32px',
  medium: '40px',
  large: '48px'
} as const;

const ANIMATION_DURATION = '150ms';
const TYPEAHEAD_TIMEOUT = 1000;

// Props interface with comprehensive type definitions
interface DropdownProps {
  options: string[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  isMulti?: boolean;
  isSearchable?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Interface for dropdown options
interface DropdownOption {
  value: string;
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
  'aria-label'?: string;
  index: number;
}

// Styled components with Material Design principles
const DropdownContainer = styled.div<{ $size: string; $hasError: boolean; $isOpen: boolean }>`
  position: relative;
  width: 100%;
  font-family: ${props => props.theme.typography.fontFamily};
  
  &:focus-within {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary.main};
  }
`;

const DropdownTrigger = styled.button<{ $size: string; $hasError: boolean; $isOpen: boolean }>`
  width: 100%;
  height: ${props => props.$size};
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid ${props => props.$hasError ? props.theme.colors.error.main : props.theme.colors.background.surface};
  border-radius: ${props => props.theme.shape.borderRadius};
  background: ${props => props.theme.colors.background.paper};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all ${ANIMATION_DURATION} ease-in-out;
  
  &:hover:not(:disabled) {
    border-color: ${props => props.theme.colors.primary.main};
  }
  
  &:disabled {
    opacity: 0.6;
    background: ${props => props.theme.colors.background.surface};
  }
`;

const DropdownMenu = styled.ul<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
  padding: 8px 0;
  background: ${props => props.theme.colors.background.paper};
  border-radius: ${props => props.theme.shape.borderRadius};
  box-shadow: ${props => props.theme.shadows.md};
  opacity: ${props => props.$isOpen ? 1 : 0};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all ${ANIMATION_DURATION} ease-in-out;
  max-height: 300px;
  overflow-y: auto;
`;

const DropdownOption = styled.li<{ $isSelected: boolean; $isDisabled: boolean }>`
  padding: 8px 12px;
  cursor: ${props => props.$isDisabled ? 'not-allowed' : 'pointer'};
  background: ${props => props.$isSelected ? props.theme.colors.primary.light : 'transparent'};
  color: ${props => props.$isSelected ? props.theme.colors.primary.contrastText : 'inherit'};
  opacity: ${props => props.$isDisabled ? 0.6 : 1};
  
  &:hover:not([aria-disabled="true"]) {
    background: ${props => props.$isSelected ? props.theme.colors.primary.light : props.theme.colors.background.surface};
  }
  
  &:focus {
    outline: none;
    background: ${props => props.theme.colors.background.surface};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  outline: none;
  
  &:focus {
    outline: none;
  }
`;

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  isMulti = false,
  isSearchable = false,
  isDisabled = false,
  placeholder = 'Select option',
  className,
  error,
  label,
  size = 'medium',
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDescendant, setActiveDescendant] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { themeMode } = useTheme();

  // Format options with selection state
  const formattedOptions: DropdownOption[] = options.map((option, index) => ({
    value: option,
    label: option,
    isSelected: Array.isArray(value) ? value.includes(option) : value === option,
    isDisabled: false,
    'aria-label': option,
    index
  }));

  // Filter options based on search term
  const filterOptions = useCallback((searchTerm: string, options: DropdownOption[]) => {
    if (!searchTerm) return options;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(lowerSearchTerm)
    );
  }, []);

  // Handle option selection
  const handleOptionClick = useCallback((option: DropdownOption) => {
    if (option.isDisabled) return;

    if (isMulti) {
      const newValue = Array.isArray(value) ? [...value] : [];
      const optionIndex = newValue.indexOf(option.value);
      
      if (optionIndex === -1) {
        newValue.push(option.value);
      } else {
        newValue.splice(optionIndex, 1);
      }
      
      onChange(newValue);
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
  }, [isMulti, onChange, value]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (isDisabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const filteredOptions = filterOptions(searchTerm, formattedOptions);
        const nextIndex = (activeDescendant + direction + filteredOptions.length) % filteredOptions.length;
        setActiveDescendant(nextIndex);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (activeDescendant !== -1) {
          const selectedOption = filterOptions(searchTerm, formattedOptions)[activeDescendant];
          if (selectedOption) handleOptionClick(selectedOption);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      }
      case 'Tab': {
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
        }
        break;
      }
    }
  }, [activeDescendant, filterOptions, formattedOptions, handleOptionClick, isDisabled, isOpen, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeDescendant !== -1 && listboxRef.current) {
      const activeElement = listboxRef.current.children[activeDescendant] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeDescendant, isOpen]);

  return (
    <DropdownContainer
      ref={dropdownRef}
      $size={DROPDOWN_SIZES[size]}
      $hasError={!!error}
      $isOpen={isOpen}
      className={className}
    >
      {label && (
        <label
          htmlFor={id}
          className="block mb-2 text-sm font-medium"
        >
          {label}
        </label>
      )}
      
      <DropdownTrigger
        type="button"
        id={id}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-invalid={!!error}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        $size={DROPDOWN_SIZES[size]}
        $hasError={!!error}
        $isOpen={isOpen}
      >
        <span className="truncate">
          {Array.isArray(value) && value.length > 0
            ? value.join(', ')
            : value || placeholder}
        </span>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size="small"
          aria-hidden="true"
        />
      </DropdownTrigger>

      <DropdownMenu
        ref={listboxRef}
        role="listbox"
        aria-multiselectable={isMulti}
        $isOpen={isOpen}
      >
        {isSearchable && (
          <SearchInput
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            aria-label="Search options"
            onKeyDown={handleKeyDown}
          />
        )}
        
        {filterOptions(searchTerm, formattedOptions).map((option, index) => (
          <DropdownOption
            key={option.value}
            role="option"
            aria-selected={option.isSelected}
            aria-disabled={option.isDisabled}
            aria-label={option['aria-label']}
            tabIndex={index === activeDescendant ? 0 : -1}
            onClick={() => handleOptionClick(option)}
            onKeyDown={handleKeyDown}
            $isSelected={option.isSelected}
            $isDisabled={option.isDisabled}
          >
            {option.label}
            {option.isSelected && (
              <Icon
                name="check"
                size="small"
                aria-hidden="true"
                className="ml-2"
              />
            )}
          </DropdownOption>
        ))}
      </DropdownMenu>

      {error && (
        <div
          role="alert"
          className="mt-1 text-sm text-error"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </DropdownContainer>
  );
};

export default Dropdown;