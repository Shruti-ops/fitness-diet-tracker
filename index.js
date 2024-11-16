const express = require('express');
const db = require('./db');
const path = require('path');
const app = express();
const session = require('express-session');


app.use(express.static('public'));  // Serve static files (CSS, JS, etc.) from 'public' folder

app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded data (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies (if you're using JSON-based APIs)
app.use(express.json());

app.use(session({
  secret: 'ThisIShruti123%',  // Use a strong, random secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Route to serve the analytics page
app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});


// Health check route
// Redirect root URL to login.html or home.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/register.html'); // Change to 'home.html' if you prefer
});


// Serve the register.html page when user accesses /register
app.get('/register', (req, res) => {
  // If the user is already logged in, redirect to home
  if (req.session.user) {
    res.redirect('/home');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
  }
});

// Serve the login.html page when user accesses /login
app.get('/login', (req, res) => {
  // If the user is already logged in, redirect to home
  if (req.session.user) {
    res.redirect('/home');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Protected route for the home page
app.get('/home', (req, res) => {
  if (req.session.user) {
    // User is logged in, serve the home.html page
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
  } else {
    // User is not logged in, redirect to login
    res.redirect('/login');
  }
});


// User Registration Route
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

  db.query(query, [name, email, password], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Error registering user');
      }
      // Store user info in session after registration
      req.session.user = { id: result.insertId, email };
      res.redirect('/home');  // Redirect to Home Page
  });
});


// User Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

  db.query(query, [email, password], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error logging in user');
    }

    if (result.length > 0) {
      // Store user info in session
      req.session.user = { id: result[0].user_id, email: result[0].email };
      res.redirect('/home');
    } else {
      res.status(401).send('Invalid email or password');
    }
  });
});


// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out');
    }
    res.redirect('/login'); // Redirect to login after logging out
  });
});

// Route to send user data for the home page
app.get('/user-info', (req, res) => {
  if (req.session.user) {
    res.json({
      email: req.session.user.email
    });
  } else {
    res.status(401).send('Not logged in');
  }
});

// Handle workout logging
app.post('/log-workout', (req, res) => {
  // Log session data
  console.log("Session data in /log-workout route:", req.session);

  // Check if user session exists
  if (!req.session.user) {
    return res.status(401).json({ message: 'User is not logged in' });
  }

  const { exercise_type, duration, intensity } = req.body;
  const user_id = req.session.user.id; // Use session user ID directly

  const query = `
      INSERT INTO workout_log (user_id, exercise_type, duration, intensity, log_date) 
      VALUES (?, ?, ?, ?, CURDATE())`;

  db.query(query, [user_id, exercise_type, duration, intensity], (err) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ message: 'Failed to log workout' });
    }
    res.json({ message: 'Workout logged successfully!' });
  });
});


// Log Meal Route
app.post('/log-meal', (req, res) => {
  const { meal_type, food_item, calories } = req.body;
  const userId = req.session.user.id;
  const query = `INSERT INTO meal_log (user_id, meal_type, food_item, calories, log_date) VALUES (?, ?, ?, ?, CURDATE())`;

  db.query(query, [userId, meal_type, food_item, calories], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to log meal' });
      res.json({ message: 'Meal logged successfully!' });
  });
});

// Log Water Intake Route
app.post('/log-water', (req, res) => {
  const { quantity } = req.body;
  const userId = req.session.user.id;
  const query = `INSERT INTO water_intake (user_id, quantity, log_date) VALUES (?, ?, CURDATE())`;

  db.query(query, [userId, quantity], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to log water intake' });
      res.json({ message: 'Water intake logged successfully!' });
  });
});


// Log Fitness Goal Route
app.post('/log-fitness-goal', (req, res) => {
  // Check if user session exists
  if (!req.session.user) {
    return res.status(401).json({ message: 'User is not logged in' });
  }

  const { goal_type, target_value, duration_weeks } = req.body;
  const userId = req.session.user.id;
  const start_date = new Date().toISOString().split('T')[0]; // Current date

  const query = `
    INSERT INTO fitness_goal_log (user_id, goal_type, target_value, duration_weeks, start_date)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [userId, goal_type, target_value, duration_weeks, start_date], (err) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ message: 'Failed to log fitness goal' });
    }
    res.json({ message: 'Fitness goal logged successfully!' });
  });
});

// Serve the profile.html page when user accesses /profile
app.get('/profile', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
  } else {
    res.redirect('/login'); // Redirect to login if not logged in
  }
});


// Fetch User Information
app.get('/user-profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'User is not logged in' });
  }

  const userId = req.session.user.id;
  const query = `
    SELECT 
      user_id, name, email, age, weight, height, fitness_goal 
    FROM 
      users 
    WHERE 
      user_id = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error fetching user profile' });
    }

    if (results.length > 0) {
      res.json(results[0]); // Return the user's profile data
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });
});



// Update User Profile
app.post('/update-profile', (req, res) => {
  const userId = req.session.user.id;
  const { age, weight, height, fitness_goal } = req.body;

  const query = `
    UPDATE users 
    SET age = ?, weight = ?, height = ?, fitness_goal = ?
    WHERE user_id = ?`;

  db.query(query, [age, weight, height, fitness_goal, userId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
    res.json({ message: 'Profile updated successfully!' });
  });
});


//api testing
// Fetch Workout Logs
app.get('/api/workout-data', (req, res) => {
  const userId = req.session.user.id;
  const query = `
    SELECT exercise_type, duration, intensity, log_date 
    FROM workout_log 
    WHERE user_id = ? 
    ORDER BY log_date DESC 
    LIMIT 30`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching workout data:', err);
      return res.status(500).json({ message: 'Failed to fetch workout data' });
    }
    res.json(results);
  });
});

// Fetch Water Intake Data
app.get('/api/water-intake-data', (req, res) => {
  const userId = req.session.user.id;
  const query = `
    SELECT log_date, SUM(quantity) as total_quantity 
    FROM water_intake 
    WHERE user_id = ? 
    GROUP BY log_date 
    ORDER BY log_date DESC 
    LIMIT 30`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching water intake data:', err);
      return res.status(500).json({ message: 'Failed to fetch water intake data' });
    }
    res.json(results);
  });
});

// Fetch Fitness Goal Progress
app.get('/api/fitness-goal-progress', (req, res) => {
  const userId = req.session.user.id;
  const query = `
    SELECT goal_type, target_value, duration_weeks, start_date, created_at 
    FROM fitness_goal_log 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching fitness goal progress:', err);
      return res.status(500).json({ message: 'Failed to fetch fitness goal progress' });
    }
    res.json(results[0] || {}); // Return the latest goal or empty object if no goals exist
  });
});




// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
