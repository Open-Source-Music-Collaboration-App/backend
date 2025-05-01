const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./utils/passport");
const authRouter = require("./routes/authentication");
const projectsRouter = require("./routes/projects");
const uploadRouter = require("./routes/upload");
const historyRouter = require("./routes/history");
const featuresRouter = require("./routes/features");
const commentsRouter = require("./routes/comments");
const adminRouter = require("./routes/admin");
const profileRouter = require("./routes/profile");
const aiRouter = require("./routes/ai");
const { init } = require("./config/init");
const collaborationRouter = require("./routes/collaboration");

init();
const app = express();

// Enable CORS to allow frontend requests
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : [
          "http://localhost:5173",
          `http://${require('os').hostname()}:5173`,
          /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
          /^http:\/\/172\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
          /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/
        ],
    credentials: true, // Allow cookies & authentication
  }),
);

// Parses JSON body
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Change to true in production with HTTPS
      httpOnly: true, // Protects against XSS attacks
      sameSite: "lax",
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth/", authRouter);

app.get("/logout", (req, res) => {
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
app.get("/api/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

app.use("/api/projects", projectsRouter);

app.use("/api/collabs", collaborationRouter)

app.use("/api/upload", uploadRouter);

app.use("/api/history", historyRouter);

app.use("/api/features", featuresRouter);

app.use("/api/comments", commentsRouter);

app.use("/api/admin", adminRouter);

app.use("/api/profile", profileRouter);

app.use("/api/ai", aiRouter); 

module.exports = app;


