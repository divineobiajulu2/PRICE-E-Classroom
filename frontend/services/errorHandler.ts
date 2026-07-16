/**
 * Global Error Handler Service
 * Centralizes error handling for API calls, providing user-friendly messages
 */

export interface ApiError {
  status?: number;
  message: string;
  details?: Record<string, any>;
}

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad request. Please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to access this resource.',
  404: 'The requested resource was not found.',
  409: 'This resource already exists.',
  422: 'Invalid data. Please check your input and try again.',
  500: 'Server error. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
};

export const errorHandler = {
  /**
   * Parse API error responses
   */
  parseError: (error: any): ApiError => {
    // Handle fetch errors
    if (error instanceof TypeError) {
      return {
        message: 'Network error. Please check your connection and try again.',
        details: { originalError: error.message }
      };
    }

    // Handle JSON response errors
    if (error.response?.data?.message) {
      return {
        status: error.response.status,
        message: error.response.data.message,
        details: error.response.data
      };
    }

    // Handle HTTP status codes
    if (error.status || error.response?.status) {
      const status = error.status || error.response.status;
      const message = ERROR_MESSAGES[status] || `Error: ${error.message || 'Unknown error occurred'}`;
      return {
        status,
        message,
        details: error.response?.data
      };
    }

    // Handle custom error messages
    if (error.message) {
      return {
        message: error.message,
        details: error
      };
    }

    return {
      message: 'An unexpected error occurred. Please try again.',
      details: error
    };
  },

  /**
   * Extract field-level validation errors from Django REST Framework response
   * Converts {"field_name": ["error1", "error2"]} to human-readable format
   */
  extractFieldErrors: (errorData: any): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};
    
    if (!errorData || typeof errorData !== 'object') {
      return fieldErrors;
    }

    Object.entries(errorData).forEach(([field, errors]: [string, any]) => {
      // Skip non-field-error entries
      if (field === 'non_field_errors' || field === 'detail') {
        return;
      }

      // Handle array of error messages (Django REST Framework format)
      if (Array.isArray(errors) && errors.length > 0) {
        fieldErrors[field] = errors[0];
      } else if (typeof errors === 'string') {
        fieldErrors[field] = errors;
      }
    });

    return fieldErrors;
  },

  /**
   * Get formatted validation error message for display
   * Returns a combined message with all field errors
   */
  getValidationMessage: (errorData: any): string => {
    const fieldErrors = errorHandler.extractFieldErrors(errorData);
    
    if (Object.keys(fieldErrors).length === 0) {
      return 'Validation error. Please check your input.';
    }

    // Format field names (convert snake_case to readable format)
    const messages = Object.entries(fieldErrors).map(([field, error]) => {
      const readableField = field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return `${readableField}: ${error}`;
    });

    return messages.join('\n');
  },

  /**
   * Check if error is authentication related
   */
  isAuthError: (error: ApiError): boolean => {
    return error.status === 401 || error.message.toLowerCase().includes('unauthorized');
  },

  /**
   * Check if error is a validation error
   */
  isValidationError: (error: ApiError): boolean => {
    return error.status === 422 || error.status === 400;
  },

  /**
   * Get user-friendly error message
   */
  getUserMessage: (error: any): string => {
    const parsed = errorHandler.parseError(error);
    return parsed.message;
  }
};
