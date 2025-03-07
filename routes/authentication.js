const authRouter = require('express').Router()
const passport = require('passport');
const createOrGetUser = require("../utils/createOrGetUser");

authRouter.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

authRouter.get('/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    async (req, res) => {
        if (!req.user) {
          return res.status(401).json({ message: "Authentication failed" });
        }
        const { id, username, emails } = req.user;
        const email = emails && emails.length > 0 ? emails[0].value : null;

        console.log("GitHub User:", { id, username, email });

        const result = await createOrGetUser(id.toString(), username || email || "GitHub User");

        if (result.error) {
          return res.status(500).json({ message: "Failed to process user", error: result.error });
        }

        //get request hostname
        console.log(req.hostname);
        res.redirect(`http://${req.hostname}:5173/dashboard`); // Redirect frontend after login
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