# SmartStock Client

A modern React application for inventory management built with Vite, Redux Toolkit, and Tailwind CSS.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Guidelines](#development-guidelines)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [API Integration](#api-integration)
- [Contributing](#contributing)

## ✨ Features

- **Modern React 19** with functional components and hooks
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Vite** for fast development and building
- **TypeScript-ready** architecture
- **Responsive design** for mobile and desktop
- **Error boundaries** and comprehensive error handling
- **Loading states** and user feedback
- **Form validation** with custom hooks
- **Local storage** integration
- **API integration** with retry logic
- **Code splitting** and lazy loading
- **ESLint** for code quality
- **Component documentation** with JSDoc

## 🛠 Tech Stack

### Core
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **React Router DOM** - Client-side routing

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Icons** - Additional icons
- **Heroicons** - Hero icons

### Development
- **ESLint** - Code linting
- **PropTypes** - Runtime type checking
- **Axios** - HTTP client

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd SmartStock/client
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Modal, etc.)
│   ├── layout/         # Layout components (Header, Footer, etc.)
│   └── features/       # Feature-specific components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API services and HTTP client
├── utils/              # Utility functions
├── constants/          # Application constants
├── app/                # Redux store configuration
│   └── slices/         # Redux slices
├── assets/             # Static assets
└── styles/             # Global styles
```

### Component Organization

- **UI Components** (`/components/ui/`): Reusable, generic components
- **Layout Components** (`/components/layout/`): Application structure components
- **Feature Components** (`/components/features/`): Business logic components
- **Page Components** (`/pages/`): Route-level components

## 📝 Development Guidelines

### Code Style

- Use **functional components** with hooks
- Follow **React best practices** and patterns
- Use **PropTypes** for type validation
- Write **JSDoc comments** for components and functions
- Follow **ESLint rules** for consistent code style

### Component Guidelines

1. **Component Structure**:
   ```jsx
   /**
    * Component description
    * @param {Object} props - Component props
    * @returns {React.ReactElement} Component
    */
   const MyComponent = ({ prop1, prop2 }) => {
     // Component logic
     return <div>Component JSX</div>;
   };

   MyComponent.propTypes = {
     prop1: PropTypes.string.isRequired,
     prop2: PropTypes.number,
   };

   export default MyComponent;
   ```

2. **Custom Hooks**:
   - Prefix with `use`
   - Handle loading and error states
   - Return consistent data structures

3. **State Management**:
   - Use Redux for global state
   - Use local state for component-specific data
   - Use custom hooks for complex state logic

### Naming Conventions

- **Components**: PascalCase (`MyComponent`)
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Files**: PascalCase for components, camelCase for utilities

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Feature Flags
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_NOTIFICATIONS=true

# Application Settings
VITE_APP_NAME=SmartStock
VITE_APP_VERSION=1.0.0
```

## 🔌 API Integration

### HTTP Client

The application uses a centralized HTTP client (`/services/httpClient.js`) with:
- **Automatic token handling**
- **Request/response interceptors**
- **Error handling**
- **Retry logic**
- **Loading states**

### API Hooks

Use the `useApi` hook for API calls:

```jsx
import { useApi } from '../hooks/useApi';
import { getUsers } from '../services/api';

const UserList = () => {
  const { data, loading, error, execute } = useApi(getUsers, {
    immediate: true,
    onSuccess: (data) => console.log('Users loaded:', data),
    onError: (error) => console.error('Failed to load users:', error),
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {data?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
};
```

## 🎨 Styling Guidelines

### Tailwind CSS

- Use Tailwind utility classes for styling
- Create custom components for repeated patterns
- Use responsive design utilities
- Follow consistent spacing and color schemes

### Component Styling

```jsx
const Button = ({ variant, size, children }) => {
  const baseClasses = 'font-medium rounded-lg transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
  };
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
  };
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </button>
  );
};
```

## 🧪 Testing

### Component Testing

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 🤝 Contributing

1. Follow the established code style and patterns
2. Write tests for new components and features
3. Update documentation as needed
4. Use meaningful commit messages
5. Create pull requests for review

## 📄 License

This project is licensed under the MIT License.
