/**
 * Loading Spinner Component
 *
 * A reusable loading spinner component with customizable size and color.
 *
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the spinner ('small', 'medium', 'large')
 * @param {string} [props.color='blue'] - Color of the spinner
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.text=''] - Optional loading text
 * @returns {React.ReactElement} The loading spinner component
 */
import PropTypes from 'prop-types';

const LoadingSpinner = ({
  size = 'medium',
  color = 'blue',
  className = '',
  text = '',
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    green: 'border-green-600',
    red: 'border-red-600',
    yellow: 'border-yellow-600',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]} 
          border-2 border-t-transparent 
          rounded-full 
          animate-spin
        `}
        aria-hidden="true"
      />
      {text && (
        <span className="mt-2 text-sm text-gray-600 font-medium">
          {text}
        </span>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['blue', 'gray', 'green', 'red', 'yellow']),
  className: PropTypes.string,
  text: PropTypes.string,
};

export default LoadingSpinner;
