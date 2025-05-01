const passport = require("passport");
const GitHubStrategy = require('passport-github2').Strategy;

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID_EXPOSE,
    clientSecret: process.env.GITHUB_CLIENT_SECRET_EXPOSE,
    // Use the exact same URL you registered with GitHub 
    callbackURL: process.env.SERVER_URL_EXPOSE + "/auth/github/callback"
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

module.exports = passport

// https://github.com/login/oauth/authorize?response_type=code&redirect_uri=http%3A%2F%2F10.140.254.31%2Fauth%2Fcallback%2Fgithub&scope=user%3Aemail&client_id=Ov23liUPI2uGt7qbZmJL