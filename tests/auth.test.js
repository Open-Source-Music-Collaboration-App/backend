// tests/auth.test.js

// Mock the passport module and strategies before any imports
jest.mock('passport', () => {
  const originalPassport = jest.requireActual('passport');
  return {
    ...originalPassport,
    authenticate: jest.fn().mockImplementation(() => (req, res, next) => {
      req.user = { id: '145629444', name: 'kaushik7489' };
      next();
    }),
    initialize: jest.fn().mockReturnValue((req, res, next) => next()),
    session: jest.fn().mockReturnValue((req, res, next) => next()),
    serializeUser: jest.fn((callback) => callback(null, { id: '145629444' })),
    deserializeUser: jest.fn((user, callback) => callback(null, user))
  };
});

jest.mock('passport-github2', () => ({
  Strategy: jest.fn().mockImplementation((options, verify) => {
    return {
      name: 'github',
      authenticate: jest.fn()
    };
  })
}));

// Now we can safely require modules
const request = require('supertest');

// Import a test Express app
const express = require('express');
const session = require('express-session');
const passport = require('passport');

// Create a minimal test app
const app = express();
app.use(express.json());
app.use(session({ 
  secret: 'test-session-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Define test routes
app.get('/auth/github', (req, res) => {
  res.redirect('https://github.com/login/oauth/authorize');
});

app.get('/auth/github/callback', (req, res) => {
  req.user = { id: '145629444', name: 'kaushik7489' };
  res.redirect('/');
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/api/me', (req, res) => {
  if (req.user) {
    res.status(200).json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Add middleware to simulate authentication for specific tests
const simulateAuth = (req, res, next) => {
  req.user = { id: '145629444', name: 'kaushik7489' };
  req.isAuthenticated = () => true;
  next();
};

// Tests
describe('Authentication Endpoints', () => {
  test('GET /auth/github redirects to GitHub', async () => {
    const response = await request(app).get('/auth/github');
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('github.com');
  });

  test('GET /auth/logout redirects', async () => {
    const response = await request(app).get('/auth/logout');
    expect(response.statusCode).toBe(302);
  });

  test('GET /api/me returns 401 when not authenticated', async () => {
    const response = await request(app).get('/api/me');
    expect(response.statusCode).toBe(401);
  });

  test('GET /api/me returns user info when authenticated', async () => {
    // Use a new app instance with authentication middleware
    const authApp = express();
    authApp.use(express.json());
    authApp.use(simulateAuth); // Apply auth middleware
    
    authApp.get('/api/me', (req, res) => {
      if (req.user) {
        res.status(200).json(req.user);
      } else {
        res.status(401).json({ error: 'Not authenticated' });
      }
    });

    const response = await request(authApp).get('/api/me');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id', '145629444');
    expect(response.body).toHaveProperty('name', 'kaushik7489');
  });
});
