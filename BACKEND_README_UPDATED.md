# Backend mock server (Express)

This repository includes a lightweight in-memory Express server for local development and to pair with the frontend.

## Installation

Dependencies are already installed. To verify:
```bash
npm list express cors multer body-parser
```

## How to run

### Option 1: PowerShell Script (Recommended on Windows)
```powershell
.\start-backend.ps1
```

### Option 2: Direct with Node
```bash
node server-wrapper.cjs
```

### Option 3: npm script
```bash
npm run server
```

**Note:** Use `server-wrapper.cjs` instead of `server.cjs` for better Windows compatibility.

Server runs on `http://localhost:4000` by default.

## Testing the API

Run the smoke tests to verify all endpoints:
```bash
node test-api.js
```

Expected output shows all 5 tests passing with HTTP 200 responses.

## Endpoints

### Authentication
- `POST /api/login` { email, password } -> returns user
- `POST /api/login/google` { profile } -> returns user (creates if not exists)
- `POST /api/register` { email, name, password } -> creates user
- `POST /api/logout` -> { ok: true }

### Users
- `GET /api/users` -> array of users
- `POST /api/users` { email, role } -> creates user
- `PUT /api/users/:id/role` { role } -> updates user role
- `DELETE /api/users/:id` -> { ok: true }

### Tasks
- `GET /api/tasks` -> array of tasks
- `POST /api/tasks` (create/update) -> task object
- `DELETE /api/tasks/:id` -> { ok: true }
- `POST /api/tasks/:id/submit` (multipart form-data with `file`) -> { task, file }

### Files
- `GET /api/files` -> array of files
- `GET /files/:id/download` -> file binary or placeholder

## Default Credentials

- **Admin:** admin@example.com / adminpassword
- **User:** user@example.com / userpassword

## Notes

- This server uses an in-memory store and is for local development only; data will reset each time you restart.
- Uploaded files are stored in memory; downloads return placeholder content if no binary buffer exists.
- On Windows, use `start-backend.ps1` for reliable server startup.
