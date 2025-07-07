/**
 * Components Module
 *
 * This module serves as the main entry point for all components in the application.
 * It provides a centralized export system for layout, UI, and feature components.
 *
 * @module components
 */

// Layout Components
export * from './layout';

// UI Components
export * from './ui';

// Feature Components
export * from './features';

// Legacy exports for backward compatibility (to be removed gradually)
export { NavigationBar as Navbar } from './layout';
export { NotFound } from './ui';
export { Footer } from './layout';