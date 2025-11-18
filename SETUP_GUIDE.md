# Task Management System - Setup & Running Guide

## Project Overview

This is a full-stack **Task Management System** with:
- **Frontend:** React 19.2.0 + TypeScript + Vite 6.2.0
- **Backend:** Express.js mock server with in-memory storage
- **Architecture:** Optimized with custom hooks, Context API, and reusable components

## Quick Start

### 1. Start the Backend Server

```powershell
# Windows (PowerShell) - Recommended
.\start-backend.ps1

# Or directly with Node
node server-wrapper.cjs
```

**Expected output:**
```
Backend mock server running on http://localhost:4000
Server is listening...
```

### 2. Verify Backend is Working

```bash
node test-api.js
```

Expected: All 5 smoke tests pass with HTTP 200 responses

### 3. Start the Frontend Dev Server (in a new terminal)

```bash
npm run dev
```

Frontend will run on `http://localhost:3000` (Vite default)

### 4. Access the Application

Open your browser to `http://localhost:3000` and login with:
- **Admin:** admin@example.com / adminpassword
- **User:** user@example.com / userpassword

## Project Structure

```
d:\web\AutoTask
├── components/
│   ├── common/           # Reusable components
│   │   ├── ActionButton.tsx
│   │   ├── FormInput.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Alert.tsx
│   │   └── index.ts
│   ├── icons/            # SVG icon components
│   ├── Dashboard.tsx
│   ├── Header.tsx
│   ├── Login.tsx
│   ├── TaskItem.tsx
│   ├── TaskList.tsx
│   ├── TaskModal.tsx
│   ├── UserManagement.tsx
│   └── UserTasksModal.tsx
├── context/              # React Context providers
│   ├── AuthContext.tsx
│   ├── DataContext.tsx
│   └── index.ts
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   ├── useTaskManagement.ts
│   ├── useUserManagement.ts
│   ├── useFileManagement.ts
│   └── index.ts
├── services/
│   └── api.ts           # API client
├── utils/               # Utility functions
│   ├── constants.ts     # Shared configuration
│   ├── taskHelpers.ts   # Task-related utilities
│   └── userHelpers.ts   # User-related utilities
├── server-wrapper.cjs   # Backend Express server (Windows-compatible)
├── test-api.js          # API smoke tests
├── start-backend.ps1    # PowerShell startup script
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
└── index.html           # HTML entry point
```

## Frontend Architecture

### Custom Hooks (Performance Optimized)

- **`useAuth`** - Login, logout, Google OAuth integration with error handling
- **`useTaskManagement`** - Create, update, delete tasks with loading/error states
- **`useUserManagement`** - User CRUD operations with callbacks
- **`useFileManagement`** - File operations using API helpers

### Context Providers

- **`AuthContext`** - Global authentication state (currentUser, isAuthenticated, logout)
- **`DataContext`** - Global data state (tasks, users, files with add/update/remove helpers)

### Reusable Components (React.memo optimized)

- **`ActionButton`** - Button with variants (primary, secondary, danger)
- **`FormInput`** - Standardized form input with label and error support
- **`Modal`** - Modal dialog with configurable width
- **`Card`** - Container component with consistent styling
- **`Alert`** - Notifications (success, error, info, warning)

### Utilities

- **`constants.ts`** - PRIORITY_CONFIG, STATUS, TASK_FILTERS, standardized CSS classes
- **`taskHelpers.ts`** - formatDate, isOverdue, getPriorityLabel, filterTasksBySearch, separateTasksByStatus, calculateMonthlyScore, rankUsersByScore
- **`userHelpers.ts`** - getUserDisplayName, getUserInitials, findUser, isSuperAdmin

## Backend API

### Base URL: `http://localhost:4000`

### Authentication Endpoints

```
POST   /api/login                  # Login with email/password
POST   /api/login/google           # Google OAuth
POST   /api/register               # Register new user
POST   /api/logout                 # Logout
```

### User Endpoints

```
GET    /api/users                  # Get all users
POST   /api/users                  # Create user
PUT    /api/users/:id/role         # Update user role (admin only)
DELETE /api/users/:id              # Delete user
```

### Task Endpoints

```
GET    /api/tasks                  # Get all tasks
POST   /api/tasks                  # Create or update task
DELETE /api/tasks/:id              # Delete task
POST   /api/tasks/:id/submit       # Submit task with file
```

### File Endpoints

```
GET    /api/files                  # Get all files
GET    /files/:id/download         # Download file
```

## Troubleshooting

### Backend won't start

**Issue:** "Port 4000 already in use"
```powershell
# Kill existing process
Stop-Process -Name node -Force

# Then restart
.\start-backend.ps1
```

### API connection errors

**Issue:** "Unable to connect to the remote server"
1. Verify server is running: `Get-Process -Name node`
2. Check port: `Get-NetTCPConnection -LocalPort 4000`
3. Use PowerShell script instead of npm: `.\start-backend.ps1`

### TypeScript errors

```bash
# Check for errors
npx tsc --noEmit

# Build frontend
npm run build
```

### Frontend won't connect to backend

1. Ensure backend is running on port 4000
2. Check `services/api.ts` has correct base URL
3. Verify CORS is enabled (it is in server-wrapper.cjs)

## Development Commands

```bash
# Frontend
npm run dev           # Start Vite dev server (port 3000)
npm run build         # Build for production
npm run preview       # Preview production build

# Backend
node server-wrapper.cjs    # Start backend server
node test-api.js           # Run API tests
npm run server             # Alternative: via npm script

# Type checking
npx tsc --noEmit      # Check TypeScript errors
```

## Default Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | adminpassword | Admin |
| user@example.com | userpassword | User |

## Features Implemented

✅ User authentication (email/password + Google)
✅ Task management (create, read, update, delete, submit)
✅ User management (admin panel for role management)
✅ File uploads and downloads
✅ Task scoring based on priority and deadline
✅ User performance ranking
✅ Responsive UI with Tailwind CSS
✅ Type-safe TypeScript throughout
✅ Performance optimized with React.memo and useCallback
✅ Comprehensive error handling
✅ Mock backend with in-memory storage

## Notes

- This is a **development environment** with mock data in-memory. Data persists only during the server runtime.
- For production, replace the backend with a real database (PostgreSQL, MongoDB, etc.)
- The server automatically calculates task scores on submission
- All API endpoints return JSON responses
- CORS is enabled for localhost:3000
