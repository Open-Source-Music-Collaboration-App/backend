const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./utils/passport');
const authRouter = require('./routes/authentication')
const projectsRouter = require("./routes/projects");
const uploadRouter = require("./routes/upload");
const { init } = require("./config/init")

init();
const app = express();

// Enable CORS to allow frontend requests
app.use(cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true // Allow cookies & authentication
}));

// Parses JSON body
app.use(express.json())

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Change to true in production with HTTPS
        httpOnly: true, // Protects against XSS attacks
        sameSite: "lax"
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth/', authRouter)

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: "Logout failed" });
        }
        req.session.destroy(() => {
            res.clearCookie("connect.sid", { path: "/" });
            res.json({ message: "Logged out successfully" });
        });
    });
});

// Check authentication status
app.get('/api/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ message: "Not authenticated" });
    }
});

app.use("/api/projects", projectsRouter);

app.use('/api/upload', uploadRouter);

module.exports = app