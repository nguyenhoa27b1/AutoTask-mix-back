# Backend mock server (Express)

This repository includes a lightweight in-memory Express server for local development and to pair with the frontend.

How to run

1. Install dependencies (you only need these for backend):

```powershell
npm install express cors multer body-parser
```

2. Start the mock backend server:

```powershell
npm run server
```

Server runs on `http://localhost:4000` by default.

Endpoints

- `POST /api/login` { email, password } -> returns user
- `POST /api/login/google` { profile } -> returns user (creates if not exists)
- `POST /api/register` { email, name, password } -> creates user
- `POST /api/logout`
- `GET /api/users`
- `POST /api/users` { email, role }
- `PUT /api/users/:id/role` { role }
- `DELETE /api/users/:id`
- `GET /api/tasks`
- `POST /api/tasks` (create/update)
- `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/submit` (multipart form-data with `file`)
- `GET /api/files`
- `GET /files/:id/download`

Notes

- This server uses an in-memory store and is for local development only; data will reset each time you restart.
- Uploaded files are stored in memory; downloads return placeholder content if no binary buffer exists.
