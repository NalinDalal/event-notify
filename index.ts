import { Server } from 'socket.io';
import { prisma } from './prisma';
import http from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import express, { type Request, type Response, type NextFunction } from 'express';

dotenv.config();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

interface AuthRequest extends Request {
    userId?: string;
}

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Extracts the token from the Authorization header, verifies it,
 * and attaches the decoded userId to the request object.
 */
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token provided" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        req.userId = decoded.id;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
};

/**
 * POST /signup
 * Registers a new user with email, password, and role.
 * Hashes the password before storing in the database.
 * Returns the created user object.
 */
app.post('/signup', async (req, res) => {
    console.log('signup endpoint hit');
    try {
        const { email, pass, role } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "User already exists" });
        const hashedPassword = await bcrypt.hash(pass, 10);
        const user = await prisma.user.create({
            data: { email, pwd: hashedPassword, role },
        });
        return res.json({ message: "User created", user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Signup failed" });
    }
});

/**
 * POST /login
 * Authenticates a user with email and password.
 * Returns a JWT token valid for 7 days on success.
 */
app.post('/login', async (req, res) => {
    console.log('login endpoint hit');
    try {
        const { email, pass } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        const validPassword = await bcrypt.compare(pass, user.pwd);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        return res.json({ message: "Login successful", token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Login failed" });
    }
});

/**
 * GET /me
 * Returns authenticated user's profile info including userId, email, role, and the current Bearer token.
 */
app.get('/me', authenticate, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json({
            userId: user.id,
            email: user.email,
            role: user.role,
            token: req.headers.authorization?.split(' ')[1],
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch user" });
    }
});

/**
 * GET /notifications
 * Lists all notifications for the authenticated user, ordered by newest first.
 */
app.get('/notifications', authenticate, async (req: AuthRequest, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(notifications);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

/**
 * POST /notify
 * Creates a new notification for a target user, saves it to the database,
 * and instantly pushes it to the target user via Socket.io in real-time.
 */
app.post('/notify', authenticate, async (req: AuthRequest, res) => {
    console.log('notify endpoint');
    try {
        const { title, body, userId } = req.body;
        const notification = await prisma.notification.create({
            data: { title, body, userId },
        });
        io.to(`user:${userId}`).emit('notification', notification);
        return res.status(201).json(notification);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create notification" });
    }
});

/**
 * GET /notify/:id
 * Marks a specific notification as read by its ID.
 */
app.get('/notify/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const notification = await prisma.notification.update({
            where: { id: req.params.id as string },
            data: { isRead: true },
        });
        return res.json(notification);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to mark as read" });
    }
});

/**
 * Socket.io connection handler.
 * - 'join': client joins a user-specific room for targeted notifications.
 * - 'notify': broadcasts data to all connected clients.
 * - 'disconnect': logs when a client disconnects.
 */
io.on('connection', (socket) => {
    console.log('New Connection established', socket.id);
    socket.on('join', (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`Socket ${socket.id} joined room user:${userId}`);
    });
    socket.on('notify', (data) => {
        console.log('notify event emitted');
        io.emit('notify', data);
    });
    socket.on("disconnect", () => {
        console.log("Socket disconnected");
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
