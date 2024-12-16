import React, { useState, useCallback, useRef, memo } from 'react'; // v18.x
import { TextField, IconButton, Popper, ClickAwayListener } from '@mui/material'; // v5.x
import { AccessTime } from '@mui/icons-material'; // v5.x
import { useTheme } from '@mui/material/styles'; // v5.x
import Input from './Input';

/**
 * Interface for TimePicker component props with comprehensive validation and accessibility support
 */
interface TimePickerProps {
  name: string;
  value: string;
  onChange: (time: string, isValid: boolean) => void;
  label?: string;
  format?: '12h' | '24h';
  disabled?: boolean;
  error?: string;
  required?: boolean;
  ariaLabel?: string;
  inputMode?: 'numeric' | 'text';
  autoComplete?: string;
}

/**
 * Interface for time validation result
 */
interface TimeValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates time string format and ranges
 * @param timeString - Time string to validate
 * @param format - Time format (12h or 24h)
 */
const validateTimeFormat = (timeString: string, format: '12h' | '24h'): TimeValidationResult => {
  if (!timeString) {
    return { isValid: false, error: 'Time is required' };
  }

  const timeRegex = format === '12h' 
    ? /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM|am|pm)$/
    : /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(timeString)) {
    return {
      isValid: false,
      error: `Please enter time in ${format === '12h' ? '12-hour (hh:mm AM/PM)' : '24-hour (HH:mm)'} format`
    };
  }

  return { isValid: true };
};

/**
 * Generates time options for dropdown
 * @param format - Time format (12h or 24h)
 */
const generateTimeOptions = (format: '12h' | '24h'): string[] => {
  const options: string[] = [];
  const intervals = 30; // 30-minute intervals

  if (format === '24h') {
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += intervals) {
        options.push(
          `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        );
      }
    }
  } else {
    for (let hour = 1; hour <= 12; hour++) {
      for (let minute = 0; minute < 60; minute += intervals) {
        options.push(
          `${hour}:${minute.toString().padStart(2, '0')} AM`,
          `${hour}:${minute.toString().padStart(2, '0')} PM`
        );
      }
    }
  }

  return options;
};

/**
 * TimePicker component with enhanced accessibility and Material Design compliance
 */
const TimePicker: React.FC<TimePickerProps> = memo(({
  name,
  value,
  onChange,
  label,
  format = '24h',
  disabled = false,
  error,
  required = false,
  ariaLabel,
  inputMode = 'text',
  autoComplete = 'off'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const anchorRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // Generate time options for dropdown
  const timeOptions = React.useMemo(() => generateTimeOptions(format), [format]);

  // Handle manual time input
  const handleTimeInput = useCallback((newValue: string, isValid: boolean) => {
    setInternalValue(newValue);
    const validation = validateTimeFormat(newValue, format);
    onChange(newValue, validation.isValid);
  }, [format, onChange]);

  // Handle time selection from dropdown
  const handleTimeSelect = useCallback((selectedTime: string) => {
    setInternalValue(selectedTime);
    onChange(selectedTime, true);
    setIsOpen(false);
  }, [onChange]);

  // Handle click away
  const handleClickAway = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle icon click
  const handleIconClick = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        if (!isOpen) {
          setIsOpen(true);
          event.preventDefault();
        }
        break;
    }
  }, [isOpen]);

  return (
    <div
      ref={anchorRef}
      style={{
        position: 'relative',
        width: '100%',
        marginBottom: theme.spacing(1)
      }}
    >
      <Input
        name={name}
        type="text"
        value={internalValue}
        onChange={handleTimeInput}
        label={label}
        disabled={disabled}
        error={error}
        required={required}
        aria-label={ariaLabel || `Time input in ${format} format`}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={format === '12h' ? 'hh:mm AM/PM' : 'HH:mm'}
      />
      
      <IconButton
        onClick={handleIconClick}
        disabled={disabled}
        aria-label="Open time picker"
        size="small"
        sx={{
          position: 'absolute',
          right: theme.spacing(1),
          top: '50%',
          transform: 'translateY(-50%)',
          color: theme.palette.text.secondary,
          '&:hover': {
            color: theme.palette.primary.main
          }
        }}
      >
        <AccessTime />
      </IconButton>

      <Popper
        open={isOpen}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ width: anchorRef.current?.clientWidth, zIndex: theme.zIndex.modal }}
      >
        <ClickAwayListener onClickAway={handleClickAway}>
          <div
            style={{
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.shadows[4],
              borderRadius: theme.shape.borderRadius,
              maxHeight: '200px',
              overflowY: 'auto'
            }}
            role="listbox"
            aria-label="Time options"
          >
            {timeOptions.map((timeOption) => (
              <div
                key={timeOption}
                role="option"
                aria-selected={timeOption === value}
                onClick={() => handleTimeSelect(timeOption)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleTimeSelect(timeOption);
                  }
                }}
                tabIndex={0}
                style={{
                  padding: theme.spacing(1),
                  cursor: 'pointer',
                  backgroundColor: timeOption === value 
                    ? theme.palette.action.selected 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
              >
                {timeOption}
              </div>
            ))}
          </div>
        </ClickAwayListener>
      </Popper>
    </div>
  );
});

TimePicker.displayName = 'TimePicker';

export default TimePicker;