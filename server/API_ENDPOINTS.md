# API Endpoints Documentation

This document lists all API endpoints available in the SmartStock server, along with a brief description of what each endpoint does.

---

## Inventory API (`/inventory`)

- `GET /` — Welcome message for the Inventory API.

---

## Forecast API (`/forecast`)

- `GET /` — Welcome message for the Forecast API.

---

## Location API (`/location`)

- `GET /` — Welcome message for the Location API.

---

## User API (`/user`)

- `GET /` — Welcome message for the User API.
- `GET /me` — Get details of the currently authenticated user. _(Requires authentication)_
- `POST /create` — Create a new user. _(Admin only, validation required)_
- `GET /all` — Get a list of all users. _(Admin only)_
- `GET /:id` — Get details of a specific user by ID. _(Requires authentication, permission required)_
- `PUT /update/:id` — Update a user by ID. _(Admin only)_
- `DELETE /delete/:id` — Delete a user by ID. _(Admin only)_

---

## Assistant API (`/assistant`)

- `GET /` — Welcome message for the Assistant API.

---

## Health API (`/health`)

- `GET /` — Returns health status, timestamp, uptime, and memory usage of the server.

---

## Auth API (`/auth`)

- `GET /` — Welcome message for the Auth API.
- `POST /login` — Log in a user. _(Validation required)_
- `GET /logout` — Log out the currently authenticated user.
- `POST /change-password` — Change password for the authenticated user. _(Validation required)_

---

## Product API (`/product`)

- `GET /` — Welcome message for the Product API.
- `POST /add` — Add a new product. _(Admin only, validation required)_
- `GET /all` — Get all products. _(Admin and staff only)_
- `GET /:id` — Get product details by ID. _(Admin and staff only)_
- `DELETE /delete/:id` — Delete a product by ID. _(Admin only)_
- `PUT /update/:id` — Update a product by ID. _(Admin only, validation required)_

---

## Alert API (`/alert`)

- `GET /` — Welcome message for the Alert API.

---

_Note: Endpoints marked with authentication/authorization/validation requirements require the user to be logged in and/or have specific roles or permissions._
