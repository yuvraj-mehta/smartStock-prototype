# API Routes Documentation

## User Routes (`/user`)

- `GET /` — Welcome to the User API
- `GET /me` — Get my details (auth required)
- `POST /create` — Create user (admin only)
- `GET /all` — Get all users (admin only)
- `GET /:id` — Get user details (auth required)
- `PUT /update/:id` — Update user (admin only)
- `DELETE /delete/:id` — Delete user (admin only)

## Inventory Routes (`/inventory`)

- `GET /` — Welcome to the Inventory API

## Forecast Routes (`/forecast`)

- `GET /` — Welcome to the forecast API

## Location Routes (`/location`)

- `GET /` — Welcome to the Location API

## Assistant Routes (`/assistant`)

- `GET /` — Welcome to the Assistant API

## Health Routes (`/health`)

- `GET /` — Returns health status, timestamp, uptime, and memory usage

## Auth Routes (`/auth`)

- `GET /` — Welcome to the Auth API
- `POST /login` — Login
- `GET /logout` — Logout (auth required)
- `POST /change-password` — Change password (auth required)

## Product Routes (`/product`)

- `GET /` — Welcome to the Product API

## Alert Routes (`/alert`)

- `GET /` — Welcome to the alert API
