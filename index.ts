import { Server } from 'socket.io';
import { prisma } from './prisma';
import http from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import express, { type Request, type Response, type NextFunction } from 'express';

dotenv.config();

const app = express();               // 1. express app first
app.use(express.json());

const server = http.createServer(app); // 2. http server wrapping express
const io = new Server(server, { cors: { origin: "*" } });

interface AuthRequest extends Request {
    userId?: string;
}

const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ error: "No token provided" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        req.userId = decoded.id;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
};

app.post('/signup', async (req, res) => {
    console.log('signup endpoint hit');
    // how do you signup
    // takes request, process it, hash the password
    // store in db
    try {
        // take the email, pwd, role
        const { email, pass, role } = req.body;

        // check if the user exists in db or not
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        // hash the pwd
        const hashedPassword = await bcrypt.hash(pass, 10);

        // create a user and store in db
        const user = await prisma.user.create({
            data: { email, pwd: hashedPassword, role },
        });

        // return a message
        return res.json({ message: "User created", user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Signup failed" });
    }
});

app.post('/login', async (req, res) => {
    console.log('login endpoint hit');
    try {
        const { email, pass } = req.body;

        // sign in process: take input from user,
        // check if it exists in database; check with hash
        // if it exists, create a session and signin
        // else throw error: user doesn't exist

        // find the user in db
        const user = await prisma.user.findUnique({ where: { email } });

        // user not found
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        // check the pwd with existing hash
        const validPassword = await bcrypt.compare(pass, user.pwd);

        // password not valid
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        // create a session: create a token via user id
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        return res.json({ message: "Login successful", token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Login failed" });
    }
});

// list all notifications for logged-in user
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

// create a notification + real-time push to target user
app.post('/notify', authenticate, async (req: AuthRequest, res) => {
    console.log('notify endpoint');
    try {
        const { title, body, userId } = req.body;

        // store in db
        const notification = await prisma.notification.create({
            data: { title, body, userId },
        });

        // emit only to target user's socket room
        io.to(`user:${userId}`).emit('notification', notification);

        return res.status(201).json(notification);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create notification" });
    }
});

// open a notification via id → mark as read
app.get('/notify/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const notification = await prisma.notification.update({
            where: { id: req.params.id as string },
            data: { isRead: true }, // isRead, not read
        });
        return res.json(notification);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to mark as read" });
    }
});

// push to all users via Socket
io.on('connection', (socket) => {
    console.log('New Connection established', socket.id);

    // client emits join with their userId after login
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
