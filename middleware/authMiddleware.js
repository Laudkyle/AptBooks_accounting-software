const jwt = require("jsonwebtoken");
const axios = require('axios');

require("dotenv").config();

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded; // Attach user info to request
      console.log("Decoded payload:", decoded);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token." });
  }
};

// Enhanced subscription middleware with retry logic
const verifySubscription = (requireActive = true, maxRetries = 2) => {
  return async (req, res, next) => {
    let retries = 0;
    
    const makeRequest = async () => {
      try {
        // Get email from authenticated user
        if (!req.user || !req.user.email) {
          return res.status(401).json({ 
            error: 'Authentication required. Please log in.' 
          });
        }

        const email = req.user.email;

        // Call the external subscription status endpoint
        const response = await axios.get('http://localhost:4000/subscription-status', {
          params: { email },
          timeout: 5000 // 5 second timeout
        });

        const subscriptionData = response.data;

        // Store subscription info in request for later use
        req.subscription = {
          status: subscriptionData.status,
          endDate: new Date(subscriptionData.endDate),
          plan: subscriptionData.plan
        };

        // Check if access should be allowed based on requirements
        if (requireActive && subscriptionData.status === 'expired') {
          return res.status(403).json({ 
            error: 'Your subscription has expired. Please renew to access this resource.',
            status: 'expired'
          });
        }

        // Allow access
        return next();

      } catch (err) {
        retries++;
        
        if (retries <= maxRetries) {
          console.log(`Retrying subscription check (${retries}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
          return makeRequest();
        }

        // Max retries reached, handle the error
        console.error('Subscription verification error after retries:', err);
        
        if (err.code === 'ECONNREFUSED') {
          return res.status(503).json({ 
            error: 'Subscription service unavailable. Please try again later.',
            status: 'service_unavailable'
          });
        }
        
        if (err.response) {
          return res.status(err.response.status).json({ 
            error: 'Subscription service error',
            details: err.response.data 
          });
        }
        
        return res.status(500).json({ 
          error: 'Failed to verify subscription status',
          details: err.message 
        });
      }
    };

    await makeRequest();
  };
};

module.exports = { authenticateUser,verifySubscription };
