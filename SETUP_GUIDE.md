# SmartStock System Setup Guide

## Quick Start Guide

### Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- npm or yarn package manager

### Setup Instructions

#### 1. Clone and Setup Backend

```bash
cd server
npm install
npm start
```

_Server will run on http://localhost:3500_

#### 2. Setup Frontend

```bash
cd client
npm install
npm run dev
```

_Client will run on http://localhost:5173 (or next available port)_

### System Features

- **Admin Panel**: Complete user and product management
- **Sales Management**: Dedicated sales and returns tracking
- **AI Assistant**: Intelligent demand prediction and stock alerts
- **Inventory Management**: Real-time stock monitoring
- **Transport Management**: Logistics and delivery tracking

### Default Login

Use the admin creation script in the server directory to create your first admin user.

### Key Pages

- `/dashboard` - Main dashboard with overview
- `/admin` - Admin-only operations and management
- `/sales` - Sales and returns management
- `/ai-assistant` - AI-powered inventory insights
- `/products` - Product catalog management
- `/inventory` - Stock level monitoring
- `/transport` - Logistics management

### API Documentation

Comprehensive API documentation is available in `server/API_DOCUMENTATION.md`

### AI Assistant Documentation

Detailed AI Assistant features and usage guide in `client/AI_ASSISTANT_DOCUMENTATION.md`
