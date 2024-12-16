/**
 * @fileoverview Enhanced form component for creating and editing habits with comprehensive validation
 * and accessibility features following WCAG 2.1 Level AA guidelines.
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react'; // v18.x
import {
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  Alert,
  TextField,
  Button,
  CircularProgress,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material'; // v5.x
import { TimePicker } from '@mui/x-date-pickers'; // v5.x
import { debounce } from 'lodash'; // v4.x

import {
  CreateHabitPayload,
  UpdateHabitPayload,
  HabitFrequency,
  FrequencyType,
  ValidationResult,
  Habit
} from '../../types/habit.types';
import {
  validateCreateHabitPayload,
  validateUpdateHabitPayload,
  HABIT_VALIDATION_MESSAGES
} from '../../validators/habit.validator';

// Interface for component props with enhanced accessibility support
interface HabitFormProps {
  habit: Habit | null;
  onSubmit: (payload: CreateHabitPayload | UpdateHabitPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  ariaLabel?: string;
}

/**
 * Enhanced form component for creating and editing habits with comprehensive validation
 * and accessibility features.
 */
const HabitForm: React.FC<HabitFormProps> = ({
  habit,
  onSubmit,
  onCancel,
  isLoading,
  ariaLabel = 'Habit creation form'
}) => {
  // Form state with type safety
  const [formData, setFormData] = useState<CreateHabitPayload>({
    name: habit?.name || '',
    description: habit?.description || '',
    frequency: habit?.frequency || {
      type: FrequencyType.DAILY,
      value: 1,
      days: [],
      customSchedule: null
    },
    reminderTime: habit?.reminderTime || null
  });

  // Validation state
  const [validationState, setValidationState] = useState<ValidationResult>({
    isValid: true,
    errors: {},
    touched: false
  });

  // Error announcement for screen readers
  const [errorAnnouncement, setErrorAnnouncement] = useState<string>('');

  // Memoized validation function based on form type
  const validateForm = useMemo(() => {
    return habit ? validateUpdateHabitPayload : validateCreateHabitPayload;
  }, [habit]);

  // Debounced validation handler
  const debouncedValidate = useCallback(
    debounce((data: CreateHabitPayload) => {
      const result = validateForm(data);
      setValidationState(result);
      
      // Update error announcement for screen readers
      if (!result.isValid) {
        const errors = Object.values(result.errors).join('. ');
        setErrorAnnouncement(`Validation errors: ${errors}`);
      } else {
        setErrorAnnouncement('');
      }
    }, 300),
    [validateForm]
  );

  // Handle form field changes with validation
  const handleChange = useCallback((field: keyof CreateHabitPayload, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      debouncedValidate(updated);
      return updated;
    });
  }, [debouncedValidate]);

  // Handle frequency type changes
  const handleFrequencyTypeChange = useCallback((type: FrequencyType) => {
    setFormData(prev => ({
      ...prev,
      frequency: {
        ...prev.frequency,
        type,
        value: 1,
        days: [],
        customSchedule: null
      }
    }));
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationResult = validateForm(formData);
    if (!validationResult.isValid) {
      setValidationState(validationResult);
      const errors = Object.values(validationResult.errors).join('. ');
      setErrorAnnouncement(`Form submission failed. ${errors}`);
      return;
    }

    try {
      await onSubmit(formData);
      setErrorAnnouncement('Form submitted successfully');
    } catch (error) {
      setErrorAnnouncement('Error submitting form. Please try again.');
    }
  };

  // Styles object for consistent theming
  const styles = {
    formContainer: {
      padding: '1.5rem',
      maxWidth: '600px',
      margin: '0 auto',
      position: 'relative',
      '&:focus': {
        outline: '2px solid var(--focus-color)'
      }
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    errorMessage: {
      color: 'error.main',
      fontSize: '0.875rem',
      marginTop: '0.25rem'
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={styles.formContainer}
      aria-label={ariaLabel}
      noValidate
    >
      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {errorAnnouncement}
      </div>

      {/* Name field */}
      <FormControl fullWidth sx={styles.formGroup} error={!!validationState.errors.name}>
        <TextField
          id="habit-name"
          label="Habit Name"
          value={formData.name}
          onChange={e => handleChange('name', e.target.value)}
          required
          inputProps={{
            'aria-label': 'Habit name',
            'aria-describedby': validationState.errors.name ? 'name-error' : undefined
          }}
          error={!!validationState.errors.name}
          helperText={validationState.errors.name}
        />
      </FormControl>

      {/* Description field */}
      <FormControl fullWidth sx={styles.formGroup} error={!!validationState.errors.description}>
        <TextField
          id="habit-description"
          label="Description"
          value={formData.description}
          onChange={e => handleChange('description', e.target.value)}
          multiline
          rows={3}
          inputProps={{
            'aria-label': 'Habit description',
            'aria-describedby': validationState.errors.description ? 'description-error' : undefined
          }}
          error={!!validationState.errors.description}
          helperText={validationState.errors.description}
        />
      </FormControl>

      {/* Frequency selection */}
      <FormControl fullWidth sx={styles.formGroup}>
        <Typography id="frequency-type-label" variant="subtitle1" gutterBottom>
          Frequency Type
        </Typography>
        <RadioGroup
          aria-labelledby="frequency-type-label"
          value={formData.frequency.type}
          onChange={e => handleFrequencyTypeChange(e.target.value as FrequencyType)}
        >
          <FormControlLabel
            value={FrequencyType.DAILY}
            control={<Radio />}
            label="Daily"
          />
          <FormControlLabel
            value={FrequencyType.WEEKLY}
            control={<Radio />}
            label="Weekly"
          />
          <FormControlLabel
            value={FrequencyType.CUSTOM}
            control={<Radio />}
            label="Custom"
          />
        </RadioGroup>
      </FormControl>

      {/* Reminder time picker */}
      <FormControl fullWidth sx={styles.formGroup} error={!!validationState.errors.reminderTime}>
        <TimePicker
          label="Reminder Time"
          value={formData.reminderTime}
          onChange={time => handleChange('reminderTime', time)}
          slotProps={{
            textField: {
              'aria-label': 'Reminder time',
              'aria-describedby': validationState.errors.reminderTime ? 'reminder-error' : undefined
            }
          }}
        />
        {validationState.errors.reminderTime && (
          <FormHelperText error id="reminder-error">
            {validationState.errors.reminderTime}
          </FormHelperText>
        )}
      </FormControl>

      {/* Form actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Cancel form"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading || !validationState.isValid}
          aria-label={isLoading ? 'Submitting form' : 'Submit form'}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </Box>

      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1
          }}
          aria-hidden="true"
        />
      )}
    </Box>
  );
};

export default HabitForm;