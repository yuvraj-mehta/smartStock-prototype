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
import { useEffect, useId, useRef } from 'react';
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
  const previousBodyOverflow = useRef('');
  const titleId = useId();

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
      previousActiveElement.current = document.activeElement;
      previousBodyOverflow.current = document.body.style.overflow;

      const focusableElements = getFocusableElements(modalRef.current);
      const focusTarget = focusableElements[0] || modalRef.current;
      focusTarget?.focus();

      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousBodyOverflow.current;

      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow.current;
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
      const focusableElements = getFocusableElements(modalRef.current);

      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      } else {
        e.preventDefault();
        modalRef.current?.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'Dialog'}
    >
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] 
          overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id={titleId} className="text-base font-semibold text-slate-950">
              {title}
            </h2>
            <Button
              variant="ghost"
              size="small"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

const getFocusableElements = (container) => (
  Array.from(container?.querySelectorAll(
    [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', '),
  ) || [])
);

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
