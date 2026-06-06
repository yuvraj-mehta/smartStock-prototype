/**
 * Button Component
 *
 * A reusable button component with multiple variants and sizes.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.variant='primary'] - Button variant
 * @param {string} [props.size='medium'] - Button size
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Whether the button is in loading state
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.type='button'] - Button type
 * @param {React.ReactNode} [props.icon] - Optional icon
 * @param {string} [props.iconPosition='left'] - Icon position
 * @returns {React.ReactElement} The button component
 */
import PropTypes from 'prop-types';
import LoadingSpinner from './LoadingSpinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap text-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const variantClasses = {
    primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700',
    secondary: 'bg-slate-700 text-white shadow-sm hover:bg-slate-800',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950',
    ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500',
    success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:ring-emerald-500',
    warning: 'bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-300 hover:bg-amber-200 focus:ring-amber-500',
  };

  const sizeClasses = {
    small: 'min-h-8 px-3 py-1.5 text-sm',
    medium: 'min-h-10 px-4 py-2 text-sm',
    large: 'min-h-11 px-5 py-2.5 text-base',
  };

  const isDisabled = disabled || loading;

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <LoadingSpinner
          size="small"
          color="white"
        />
      )}

      {!loading && icon && iconPosition === 'left' && (
        <span className="shrink-0">{icon}</span>
      )}

      {children}

      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'warning']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
};

export default Button;
