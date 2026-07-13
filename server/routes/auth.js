const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { authenticate, authorize, JWT_SECRET } = require('../middleware/auth');
const { cookieSecure, googleClientId } = require('../config/env');

const client = googleClientId ? new OAuth2Client(googleClientId) : null;

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  const errors = {};
  if (!name || !name.trim()) errors.name = 'Full Name is required.';
  if (!email || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }
  if (password && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (!role) {
    errors.role = 'Requested role is required.';
  } else if (!['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'].includes(role)) {
    errors.role = 'Invalid role selection.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ errors: { email: 'An account with this email already exists.' } });
    }

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;
    const finalRole = isFirstUser ? 'FleetManager' : role;
    const status = isFirstUser ? 'Active' : 'PendingApproval';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: finalRole,
      accountStatus: status
    });

    await user.save();

    res.status(201).json({
      message: status === 'Active' 
        ? 'Fleet Manager account auto-created and activated.' 
        : 'Registration successful. Your account is awaiting approval.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if account is currently locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      return res.status(423).json({ 
        error: `Account locked due to 5 consecutive failed attempts. Try again in ${remainingMin} minute(s).` 
      });
    }

    // Check if account is active
    if (user.accountStatus === 'PendingApproval') {
      return res.status(403).json({ error: 'Your account is awaiting approval.' });
    }
    if (user.accountStatus === 'Rejected') {
      return res.status(403).json({ error: 'Your account access request was rejected.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Handle login failure and locking
      let updateData = {};
      const newAttempts = user.failedLoginAttempts + 1;
      
      if (newAttempts >= 5) {
        updateData = {
          failedLoginAttempts: newAttempts,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
        };
        await User.updateOne({ _id: user._id }, updateData);
        return res.status(423).json({ 
          error: 'Account locked due to 5 consecutive failed attempts. Please try again in 15 minutes.' 
        });
      } else {
        updateData = { failedLoginAttempts: newAttempts };
        await User.updateOne({ _id: user._id }, updateData);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
    }

    // Reset login attempts on success
    await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, lockedUntil: null });

    // Generate JWT (extend token expiry if rememberMe is checked)
    const expiryString = rememberMe ? '30d' : '2h';
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: expiryString }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
      maxAge: cookieMaxAge
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: cookieSecure, sameSite: 'strict' });
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/pending-signups (FleetManager only)
router.get('/pending-signups', authenticate, authorize(['FleetManager']), async (req, res) => {
  try {
    const pending = await User.find({ accountStatus: 'PendingApproval' }).select('-passwordHash');
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending signups:', error);
    res.status(500).json({ error: 'Server error retrieving pending signups.' });
  }
});

// POST /api/auth/approve-signup/:id (FleetManager only)
router.post('/approve-signup/:id', authenticate, authorize(['FleetManager']), async (req, res) => {
  try {
    const userToApprove = await User.findById(req.params.id);
    if (!userToApprove) {
      return res.status(404).json({ error: 'User not found.' });
    }
    userToApprove.accountStatus = 'Active';
    await userToApprove.save();
    res.json({ message: 'User account approved successfully.', user: userToApprove });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Server error approving user account.' });
  }
});

// POST /api/auth/reject-signup/:id (FleetManager only)
router.post('/reject-signup/:id', authenticate, authorize(['FleetManager']), async (req, res) => {
  try {
    const userToReject = await User.findById(req.params.id);
    if (!userToReject) {
      return res.status(404).json({ error: 'User not found.' });
    }
    userToReject.accountStatus = 'Rejected';
    await userToReject.save();
    res.json({ message: 'User account rejected successfully.', user: userToReject });
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Server error rejecting user account.' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { idToken, role } = req.body;
  const isMockGoogleDemo = idToken === 'mock-google-token' && process.env.NODE_ENV !== 'production';

  if (!idToken) {
    return res.status(400).json({ error: 'Google ID Token is required.' });
  }

  try {
    let payload;
    
    if (isMockGoogleDemo) {
      console.log('Using mock Google token verification.');
      payload = {
        email: 'google.demo@transitops.com',
        name: 'Google Demo User'
      };
    } else if (googleClientId && client) {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId
      });
      payload = ticket.getPayload();
    } else {
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured in production.' });
      }
      console.warn('GOOGLE_CLIENT_ID is missing. Decoding Google Token payload without validation for local testing.');
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        return res.status(400).json({ error: 'Invalid Google ID Token format.' });
      }
      const buffer = Buffer.from(parts[1], 'base64');
      payload = JSON.parse(buffer.toString('utf-8'));
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google Token payload.' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Google User';

    let user = await User.findOne({ email });

    let isNewUser = false;
    if (!user) {
      const userCount = await User.countDocuments();
      const isFirstUser = userCount === 0;
      const finalRole = isFirstUser ? 'FleetManager' : (role || 'Dispatcher');
      // The local demo control is an immediate sign-in path, not a registration request.
      const status = isFirstUser || isMockGoogleDemo ? 'Active' : 'PendingApproval';

      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);

      user = new User({
        name,
        email,
        passwordHash: dummyPassword,
        role: finalRole,
        accountStatus: status
      });

      await user.save();
      isNewUser = true;
    }

    // Check if user is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      return res.status(423).json({ 
        error: `Account locked. Try again in ${remainingMin} minute(s).` 
      });
    }

    // Check account status
    if (user.accountStatus === 'PendingApproval') {
      return res.status(403).json({ 
        error: 'Your account is awaiting approval.',
        isPending: true 
      });
    }
    if (user.accountStatus === 'Rejected') {
      return res.status(403).json({ error: 'Your account access request was rejected.' });
    }

    // Reset login attempts
    await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, lockedUntil: null });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      message: isNewUser ? 'Google registration successful.' : 'Google login successful.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Google Auth backend error:', error);
    res.status(500).json({ error: 'Server error during Google authentication.' });
  }
});

// POST /api/auth/guest
router.post('/guest', async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'];

  if (!role || !allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid guest role.' });
  }

  try {
    const email = `guest.${role.toLowerCase()}@transitops.com`;
    const name = `Guest ${role.replace(/([A-Z])/g, ' $1').trim()}`;

    let user = await User.findOne({ email });

    if (!user) {
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = new User({
        name,
        email,
        passwordHash: dummyPassword,
        role,
        accountStatus: 'Active'
      });
      await user.save();
    } else {
      if (user.accountStatus !== 'Active') {
        user.accountStatus = 'Active';
        await user.save();
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      message: 'Guest login successful.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Guest login backend error:', error);
    res.status(500).json({ error: 'Server error during guest login.' });
  }
});

// GET /api/auth/google-client-id
router.get('/google-client-id', (req, res) => {
  res.json({ clientId: googleClientId || '' });
});

module.exports = router;
