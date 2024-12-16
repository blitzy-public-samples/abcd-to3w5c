import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { renderWithProviders } from '../utils/test-utils';

// Button Component Test Suite
describe('Button Component', () => {
  // Rendering Tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithProviders(
        <Button>Click Me</Button>
      );
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('MuiButtonBase-root');
      expect(button).not.toBeDisabled();
    });

    it('renders all variants correctly', () => {
      const { rerender } = renderWithProviders(
        <Button variant="primary">Primary</Button>
      );
      expect(screen.getByRole('button')).toHaveStyle({
        backgroundColor: expect.any(String)
      });

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveStyle({
        backgroundColor: expect.any(String)
      });

      rerender(<Button variant="text">Text</Button>);
      expect(screen.getByRole('button')).toHaveStyle({
        backgroundColor: 'transparent'
      });
    });

    it('renders different sizes correctly', () => {
      const { rerender } = renderWithProviders(
        <Button size="small">Small</Button>
      );
      let button = screen.getByRole('button');
      expect(button).toHaveStyle({ minHeight: '32px' });

      rerender(<Button size="medium">Medium</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({ minHeight: '40px' });

      rerender(<Button size="large">Large</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveStyle({ minHeight: '48px' });
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    it('handles click events', async () => {
      const handleClick = jest.fn();
      renderWithProviders(
        <Button onClick={handleClick}>Click Me</Button>
      );
      
      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', async () => {
      const handleClick = jest.fn();
      renderWithProviders(
        <Button disabled onClick={handleClick}>Click Me</Button>
      );
      
      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading state correctly', () => {
      renderWithProviders(
        <Button loading>Loading</Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const handleClick = jest.fn();
      renderWithProviders(
        <Button onClick={handleClick}>Press Me</Button>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });

    it('provides proper ARIA attributes', () => {
      renderWithProviders(
        <Button
          ariaLabel="Custom Label"
          ariaDescribedBy="description"
          ariaExpanded={true}
          ariaControls="menu"
        >
          Accessible Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
      expect(button).toHaveAttribute('aria-describedby', 'description');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'menu');
    });
  });
});

// Input Component Test Suite
describe('Input Component', () => {
  // Rendering Tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithProviders(
        <Input
          name="test"
          type="text"
          value=""
          onChange={() => {}}
        />
      );
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders different input types correctly', () => {
      const { rerender } = renderWithProviders(
        <Input
          name="email"
          type="email"
          value=""
          onChange={() => {}}
        />
      );
      
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

      rerender(
        <Input
          name="password"
          type="password"
          value=""
          onChange={() => {}}
        />
      );
      
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');
    });
  });

  // Validation Tests
  describe('Validation', () => {
    it('handles required validation', async () => {
      const handleChange = jest.fn();
      renderWithProviders(
        <Input
          name="test"
          type="text"
          value=""
          onChange={handleChange}
          required
        />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'a');
      await userEvent.clear(input);
      
      expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    });

    it('validates email format', async () => {
      const handleChange = jest.fn();
      renderWithProviders(
        <Input
          name="email"
          type="email"
          value=""
          onChange={handleChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'invalid-email');
      fireEvent.blur(input);
      
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    it('handles value changes', async () => {
      const handleChange = jest.fn();
      renderWithProviders(
        <Input
          name="test"
          type="text"
          value=""
          onChange={handleChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test value');
      
      expect(handleChange).toHaveBeenCalledTimes(10); // One call per character
    });

    it('handles disabled state', () => {
      renderWithProviders(
        <Input
          name="test"
          type="text"
          value=""
          onChange={() => {}}
          disabled
        />
      );
      
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      renderWithProviders(
        <Input
          name="test"
          type="text"
          value=""
          onChange={() => {}}
          aria-label="Custom Input"
          aria-describedby="helper-text"
          required
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Custom Input');
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('helper-text'));
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('handles error states accessibly', async () => {
      renderWithProviders(
        <Input
          name="test"
          type="text"
          value=""
          onChange={() => {}}
          error="Error message"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });
});