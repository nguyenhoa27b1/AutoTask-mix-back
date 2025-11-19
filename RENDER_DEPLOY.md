# TaskFlow Backend

Backend server for TaskFlow - Task Management System

## Deploy on Render

This backend is designed to run on Render.com

### Environment Variables Required:
- `USE_REAL_EMAIL` - Set to "true" to send real emails
- `GMAIL_USER` - Your Gmail address
- `GMAIL_APP_PASSWORD` - Gmail App Password (from https://myaccount.google.com/apppasswords)
- `PORT` - Automatically set by Render
- `HOST` - Use "0.0.0.0" for network access

## Local Development

```bash
npm install
node server-wrapper.cjs
```

Server runs on http://localhost:4000
