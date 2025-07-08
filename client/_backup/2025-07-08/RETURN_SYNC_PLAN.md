# Frontend-Backend Return Management Sync Plan

## Overview

This document tracks the step-by-step plan to align the frontend return management UI/UX and logic with the backend implementation.

---

## Step-by-Step Plan

### **Step 1: Map and Display Full Return Lifecycle**

- [x] Show the current status (`returnStatus`) for each return in the list.
- [x] Display all possible statuses: `initiated`, `pickup_scheduled`, `picked_up`, `received`, `processed`.
- [x] Add visual cues (badges, colors) for each status.

### **Step 2: Implement All Return Actions**

- [x] For each return, show action buttons based on status:
  - [x] **Initiated:** Show “Schedule Pickup” (open modal to select transporter, add notes).
  - [x] **Pickup Scheduled:** Show “Mark Picked Up” (confirmation dialog, optional notes).
  - [x] **Picked Up:** Show “Process at Warehouse” (confirmation dialog, optional notes).
- [x] Call the correct API endpoints for "Schedule Pickup", "Mark Picked Up", and "Process at Warehouse" and update the UI on success.

### **Step 3: Improve Error Handling and Feedback**

- [x] Show backend error messages clearly in the UI (e.g., expired window, invalid data).
- [x] Show loading indicators for all async actions.

### **Step 4: Display Related Data**

- [x] Show transporter, warehouse, and transport info for each return (if available).
- [x] Show returned item details with product and batch info.

### **Step 5: Add Optional Enhancements**

- [ ] Allow file uploads (e.g., photos) when initiating a return or scheduling pickup.
- [ ] Add notifications or status tracking for users (e.g., “Your return is picked up”).
- [ ] Add filters/search for returns by status, date, etc.

---

## Progress Log

- **2025-07-08:** Plan created and committed.
- **2025-07-08:** Step 1 completed: All return statuses are now shown with color-coded badges in the UI.
- **2025-07-08:** Step 2 (Mark Picked Up) implemented: UI and backend integration for marking a return as picked up.
- **2025-07-08:** Step 2 (Process at Warehouse) implemented: UI and backend integration for processing a return at the warehouse.
- **2025-07-08:** Step 3 completed: Error messages and loading indicators are now shown for all return actions and modals.
- **2025-07-08:** Step 4 completed: Related data (transporter, warehouse, processed by, product, batch) is now displayed for each return.
