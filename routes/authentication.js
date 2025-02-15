const authRouter = require('express').Router()
const passport = require('passport');

authRouter.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

authRouter.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('http://localhost:5173/dashboard'); // Redirect frontend after login
    }
);

authRouter.get('/logout', (req, res) => {
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

module.exports = authRouter