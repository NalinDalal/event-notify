# event-notify

Mini Real-Time Notification Service — users can register/login, receive notifications instantly via Socket.io, and manage them via REST APIs.

## Setup

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
bun install

# Run database migrations
bunx prisma migrate deploy

# Start server
bun run index.ts
```

Server runs on `http://localhost:3000`.

## API Endpoints

### Signup

```bash
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@demo.com","pass":"pass123","role":"USER"}'
```

### Login

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@demo.com","pass":"pass123"}'
```

Returns a JWT token. Use it in subsequent requests as `Authorization: Bearer <token>`.

### List Notifications

```bash
curl http://localhost:3000/notifications \
  -H "Authorization: Bearer <token>"
```

### Create Notification (instantly pushed via Socket.io)

```bash
curl -X POST http://localhost:3000/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Hello","body":"This is a notification","userId":"<target-user-id>"}'
```

### Mark Notification as Read

```bash
curl http://localhost:3000/notify/<notification-id> \
  -H "Authorization: Bearer <token>"
```

## Real-Time Notifications (Socket.io)

After login, connect via Socket.io and join your user room:

```js
const socket = io("http://localhost:3000");

// Join your personal room after getting userId from signup/login
socket.emit("join", "<your-user-id>");

// Listen for new notifications
socket.on("notification", (data) => {
  console.log("New notification:", data);
});
```
