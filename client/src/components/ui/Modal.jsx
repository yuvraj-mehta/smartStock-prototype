/**
 * Modal Component
 *
 * A reusable modal component with customizable content and actions.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.title=''] - Modal title
 * @param {string} [props.size='medium'] - Modal size
 * @param {boolean} [props.closeOnOverlayClick=true] - Whether to close on overlay click
 * @param {boolean} [props.closeOnEsc=true] - Whether to close on ESC key
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {React.ReactElement|null} The modal component
 */
import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  children,
  title = '',
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full',
  };

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;

      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';

      // Restore focus to previously active element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, closeOnEsc, onClose]);

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      // Handle tab navigation within modal
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] 
          bg-white rounded-lg shadow-xl overflow-hidden
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
            <Button
              variant="ghost"
              size="small"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', 'full']),
  closeOnOverlayClick: PropTypes.bool,
  closeOnEsc: PropTypes.bool,
  className: PropTypes.string,
};

export default Modal;
