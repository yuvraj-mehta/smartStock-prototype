# GitHub Copilot Instructions for SmartStock Project

## Project Overview

SmartStock is a comprehensive inventory and supply chain management system built with a React frontend and Node.js/Express backend. The system manages warehouse operations, inventory tracking, sales, returns, and user management.

## Architecture

- **Frontend**: React 19 + Vite + Redux Toolkit + TailwindCSS
- **Backend**: Node.js + Express + MongoDB + Mongoose
- **Authentication**: JWT-based authentication with role-based access control
- **File Structure**: Monorepo with `client/` and `server/` directories

## Core Development Guidelines

### 1. Code Style & Standards

#### Frontend (React)

- Use functional components with hooks
- Implement Redux Toolkit for state management with slices
- Use TailwindCSS for styling with modern, responsive design
- Follow ES6+ syntax and destructuring patterns
- Use async/await for API calls with proper error handling
- Component names should be PascalCase
- File names should match component names

#### Backend (Node.js/Express)

- Use ES6 modules (type: "module" in package.json)
- Follow MVC architecture pattern
- Use async/await with proper error handling middleware
- Implement proper validation using express-validator
- Use bcrypt for password hashing
- Follow RESTful API conventions
- Use proper HTTP status codes

### 2. Project-Specific Patterns

#### Authentication & Authorization

- JWT tokens stored in Redux state
- Role-based access control: 'admin', 'staff', 'viewer'
- Protected routes using auth middleware
- Email verification and password reset functionality

#### API Structure

- Controllers handle business logic
- Routes define endpoints
- Middleware for authentication, validation, and error handling
- Models define MongoDB schemas with Mongoose

#### Error Handling

- Use async error handler middleware
- Standardized error responses with proper status codes
- Client-side error boundaries and user feedback

### 3. Key Models & Relationships

#### Core Entities

- **User**: System users with roles and warehouse assignments
- **Product**: Master product data with categories and specifications
- **Inventory**: Stock levels and warehouse locations
- **Item**: Individual inventory items with batch tracking
- **Batch**: Product batches with expiry dates and supplier info
- **Transport**: Logistics and shipping management
- **Sales**: Transaction records and customer data
- **Returns**: Return processing and inventory adjustments

#### Important Fields & Validations

- All monetary values should be Numbers (not Strings)
- Dates should use proper Date objects
- Email addresses must be lowercase and trimmed
- Phone numbers should be validated
- Passwords must be hashed with bcrypt
- ObjectIds for relationships between models

### 4. Frontend Development Rules

#### Component Structure

```jsx
// Standard component template
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

const ComponentName = () => {
  // State and hooks first
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.sliceName);

  // Event handlers
  const handleEvent = async () => {
    // Implementation
  };

  // Render with TailwindCSS classes
  return <div className="container mx-auto p-4">{/* Component content */}</div>;
};

export default ComponentName;
```

#### Redux Patterns

- Use createSlice from Redux Toolkit
- Implement async thunks for API calls
- Handle loading, success, and error states
- Use proper payload structures

#### Styling Guidelines

- Use TailwindCSS utility classes
- Implement responsive design (mobile-first)
- Use consistent color scheme (gray-900 backgrounds, red-400 accents)
- Create reusable component classes

### 5. Backend Development Rules

#### Controller Pattern

```javascript
// Standard controller template
export const controllerFunction = asyncHandler(async (req, res) => {
  // Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  // Business logic
  const result = await Model.find(/* query */);

  // Response
  res.status(200).json({
    success: true,
    message: "Operation successful",
    data: result,
  });
});
```

#### Model Schema Patterns

```javascript
// Standard schema template
const modelSchema = new mongoose.Schema(
  {
    // Fields with proper validation
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    // Relationships
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // Auto createdAt/updatedAt
  }
);

// Indexes for performance
modelSchema.index({ field: 1 });

export default mongoose.model("ModelName", modelSchema);
```

### 6. API Conventions

#### Request/Response Format

- Use consistent JSON structure
- Include success boolean
- Provide meaningful messages
- Handle pagination with limit/skip
- Use proper HTTP methods (GET, POST, PUT, DELETE)

#### Standard Response Format

```json
{
  "success": true/false,
  "message": "Descriptive message",
  "data": {}, // Response data
  "errors": [], // Validation errors if any
  "pagination": { // If applicable
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100
  }
}
```

### 7. Security Best Practices

#### Authentication

- Hash passwords with bcrypt (saltRounds: 12)
- Use strong JWT secrets
- Implement token expiration
- Validate all user inputs

#### Data Protection

- Sanitize user inputs
- Use CORS properly
- Implement rate limiting
- Validate file uploads
- Use environment variables for secrets

### 8. Testing & Validation

#### Input Validation

- Use express-validator for backend validation
- Validate all required fields
- Check data types and formats
- Sanitize inputs to prevent injection

#### Error Scenarios

- Handle network failures gracefully
- Provide user-friendly error messages
- Log errors for debugging
- Implement retry mechanisms where appropriate

### 9. Performance Guidelines

#### Database

- Use appropriate indexes
- Implement pagination for large datasets
- Use select() to limit returned fields
- Avoid N+1 queries with proper population

#### Frontend

- Implement lazy loading for components
- Use useCallback and useMemo appropriately
- Optimize bundle size with code splitting
- Cache API responses where appropriate

### 10. File Organization Rules

#### Frontend Structure

```
src/
  components/         # Reusable UI components
  pages/             # Route components
  store/             # Redux store configuration
  slices/            # Redux slices
  utils/             # Helper functions
  hooks/             # Custom hooks
  constants/         # App constants
```

#### Backend Structure

```
server/
  controllers/       # Business logic
  models/           # Database schemas
  routes/           # API endpoints
  middleware/       # Custom middleware
  validators/       # Input validation
  utils/            # Helper functions
  config/           # Configuration files
```

### 11. Documentation Requirements

#### Code Comments

- Document complex business logic
- Explain non-obvious code sections
- Use JSDoc for function documentation
- Include TODO comments for future improvements

#### API Documentation

- Document all endpoints with examples
- Include request/response schemas
- Specify authentication requirements
- Provide error code explanations

### 12. Common Patterns to Follow

#### State Management

- Keep state normalized
- Use selectors for derived data
- Handle loading states consistently
- Implement optimistic updates where appropriate

#### Form Handling

- Use controlled components
- Implement proper validation
- Show loading states during submission
- Handle success/error feedback

#### Data Fetching

- Use RTK Query or createAsyncThunk
- Handle loading, success, and error states
- Implement proper caching strategies
- Show skeleton loaders during loading

## Development Workflow

1. **Before Making Changes**: Always check current file contents
2. **Code Quality**: Follow ESLint rules and maintain consistency
3. **Testing**: Test all new functionality thoroughly
4. **Documentation**: Update documentation when adding new features
5. **Security**: Review code for security vulnerabilities
6. **Performance**: Consider performance implications of changes

## Key Dependencies & Their Usage

### Frontend

- **React 19**: Latest features and improvements
- **Redux Toolkit**: State management with RTK Query
- **TailwindCSS**: Utility-first CSS framework
- **Axios**: HTTP client for API calls
- **Vite**: Build tool and dev server

### Backend

- **Express 5**: Web framework
- **Mongoose**: MongoDB ODM
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT implementation
- **express-validator**: Input validation
- **nodemailer**: Email functionality

Remember: Always prioritize security, performance, and maintainability in all code contributions to the SmartStock project.

use the inspiration frontend inside the inspiration folder in the root directory to take help in designing the frontend
