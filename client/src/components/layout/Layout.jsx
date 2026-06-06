import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

/**
 * Layout Component
 *
 * Main layout wrapper that provides the overall structure for the application.
 * Includes navigation, main content area, and footer.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} [props.children] - Content to render in layout
 * @param {boolean} [props.showNavigation=true] - Whether to show navigation bar
 * @param {boolean} [props.showFooter=true] - Whether to show footer
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {React.ReactElement} The layout component
 */
const Layout = ({
  children,
  showNavigation = true,
  showFooter = true,
  className = '',
}) => {
  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-950 ${className}`}>
      {showNavigation && (
        <header className="sticky top-0 z-40">
          <NavigationBar />
        </header>
      )}

      <main className="flex-1 flex flex-col">
        {children || <Outlet />}
      </main>

      {showFooter && (
        <div className="mt-auto">
          <Footer />
        </div>
      )}
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node,
  showNavigation: PropTypes.bool,
  showFooter: PropTypes.bool,
  className: PropTypes.string,
};

export default Layout;
