
// server.js with integrated connection testing
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 8000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function categorizeFeedback(feedback) {
  try {
    // Check if API key is properly configured
    if (!process.env.GEMINI_API_KEY) {
      logWithTimestamp('Missing Gemini API key in environment variables');
      return 'Uncategorized';
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const feedbackText = `
    User Type: ${feedback.userType || "Unknown"}
    Satisfaction Score: ${feedback.satisfactionScore || 0}/5
    Responsiveness Rating: ${feedback.responsiveness || 0}/5
    Quality Rating: ${feedback.quality || 0}/5
    Moderation Rating: ${feedback.moderation || 0}/5
    
    What they like: ${feedback.likes || "Not provided"}
    
    Suggested improvements: ${feedback.improvements || "Not provided"}
    
    Additional suggestions: ${feedback.suggestions || "Not provided"}
    
    Topics interested in: ${feedback.topics ? feedback.topics.join(", ") : "None selected"}
    `;
    
    const prompt = `
    Categorize this community feedback into one of the following categories:
    - Feature Request
    - Bug Report
    - Complaint
    - Praise
    - Question
    - Suggestion
    
    Here is the feedback details:
    ${feedbackText}
    
    Return only the category name, nothing else:`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim();
    
    logWithTimestamp(`Successfully categorized feedback as: ${category}`);
    return category;
  } catch (error) {
    // Enhanced error handling with specific responses for different error types
    if (error.message && error.message.includes('API key')) {
      logError('Invalid or missing Gemini API key', error);
      return 'API Configuration Error';
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      logError('Connection to Gemini API failed', error);
      return 'API Connection Error';
    } else if (error.message && error.message.includes('quota')) {
      logError('Gemini API quota exceeded', error);
      return 'API Quota Error';
    } else {
      logError('Error categorizing feedback:', error);
      return 'Uncategorized';
    }
  }
}

async function generateResponse(feedback, category) {
  try {
    // Check if API key is properly configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('ERROR: Missing Gemini API key in environment variables');
      return 'Thank you for your feedback! Our team will review it shortly. (Note: AI response generation is currently unavailable)';
    }

    console.log('=== GEMINI API REQUEST ===');
    console.log('Initializing Gemini API with model: gemini-1.5-pro');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Get user type in a more readable format
    let userTypeReadable = feedback.userType;
    if (feedback.userType === "new-member") userTypeReadable = "new member";
    if (feedback.userType === "regular-member") userTypeReadable = "regular member";
    if (feedback.userType === "long-term-member") userTypeReadable = "long-term member";
    
    const prompt = `
    Write a brief, personalized response to this community member's feedback.
    The feedback falls into the category: ${category}.
    
    Feedback details:
    - User type: ${userTypeReadable}
    - Overall satisfaction: ${feedback.satisfactionScore}/5
    - Rated community responsiveness as: ${feedback.responsiveness}/5
    - Rated discussion quality as: ${feedback.quality}/5
    - Rated moderation effectiveness as: ${feedback.moderation}/5
    - What they liked: "${feedback.likes || "Not specified"}"
    - What they want improved: "${feedback.improvements || "Not specified"}"
    - Their specific suggestions: "${feedback.suggestions || "Not specified"}"
    - Topics they're interested in: ${feedback.topics ? feedback.topics.join(", ") : "None selected"}
    
    Write a thoughtful, personalized response acknowledging specific points they mentioned.
    Keep it under 150 words and make it sound natural and conversational.
    If they gave low scores (1-2) in any area, acknowledge those concerns specifically.
    If they gave high scores (4-5), express appreciation for their positive feedback.
    If they want to be contacted (${feedback.contactPermission ? "yes" : "no"}), mention that in your response.
    
    Sign it from "The Community Team"
    `;
    
    console.log('Sending prompt to Gemini API...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();
    
    console.log('=== GEMINI API RESPONSE ===');
    console.log(responseText);
    console.log('=== END GEMINI API RESPONSE ===');
    
    return responseText;
  } catch (error) {
    // Enhanced error handling with specific fallback responses
    console.error('=== GEMINI API ERROR ===');
    console.error(`Error Type: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    console.error(error.stack);
    console.error('=== END GEMINI API ERROR ===');
    
    if (error.message && error.message.includes('API key')) {
      logError('Invalid or missing Gemini API key', error);
      return 'Thank you for your feedback! Our team will review it shortly. (Note: AI response generation is currently unavailable)';
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      logError('Connection to Gemini API failed', error);
      return 'Thank you for your valuable feedback. Our team will review it promptly. (Note: Our response system is experiencing connectivity issues)';
    } else if (error.message && error.message.includes('quota')) {
      logError('Gemini API quota exceeded', error);
      return 'Thank you for your feedback! A team member will review it soon. (Note: Our automated response system is temporarily unavailable)';
    } else {
      logError('Error generating response:', error);
      return 'Thank you for your feedback. Our team will review it shortly.';
    }
  }
}

// Add this new endpoint for basic Gemini testing
app.get('/api/test-gemini', async (req, res) => {
  console.log('=== BASIC GEMINI API TEST ===');
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('ERROR: Gemini API key is not configured');
      return res.status(500).json({
        success: false,
        message: 'Gemini API key is not configured in environment variables'
      });
    }
    
    // Just check if the API key is configured
    res.status(200).json({
      success: true,
      message: 'Gemini API key is configured'
    });
  } catch (error) {
    console.error('=== GEMINI TEST ERROR ===');
    console.error(`Error Type: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    console.error(error.stack);
    console.error('=== END GEMINI TEST ERROR ===');
    
    res.status(500).json({
      success: false,
      message: 'Gemini API test failed',
      error: error.message
    });
  }
});

// Add this new endpoint for more detailed Gemini testing
app.get('/api/test-gemini-detailed', async (req, res) => {
  console.log('=== DETAILED GEMINI API TEST ===');
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('ERROR: Gemini API key is not configured');
      return res.status(500).json({
        success: false,
        message: 'Gemini API key is not configured in environment variables'
      });
    }
    
    console.log('API Key configured: ' + (process.env.GEMINI_API_KEY ? 'Yes (masked)' : 'No'));
    console.log('Testing API connection...');

    // Try a simple generation to test the API connection
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Created Gemini model instance');
    
    const testPrompt = "Respond with 'API connection successful' if you can read this";
    console.log(`Sending test prompt: "${testPrompt}"`);
    
    const result = await model.generateContent(testPrompt);
    console.log('Received raw result from API');
    
    const response = await result.response;
    const responseText = response.text().trim();
    
    console.log('=== GEMINI TEST RESPONSE ===');
    console.log(responseText);
    console.log('=== END GEMINI TEST RESPONSE ===');
    
    res.status(200).json({
      success: true,
      message: 'Gemini API test successful',
      response: responseText,
      details: {
        prompt: testPrompt,
        model: "gemini-1.5-flash",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('=== GEMINI TEST ERROR ===');
    console.error(`Error Type: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    console.error(error.stack);
    console.error('=== END GEMINI TEST ERROR ===');
    
    res.status(500).json({
      success: false,
      message: 'Gemini API test failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/gemini-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gemini-test.html'));
});

// Add timestamp to console logs
function logWithTimestamp(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Enhanced error handling and logging
function logError(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${message}:`, error);
  if (error.stack) {
    console.error(error.stack);
  }
}

// CORS configuration - updated to match frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  logWithTimestamp(`${req.method} ${req.url}`);
  next();
});

// MongoDB Connection with improved error handling and testing
const connectDB = async () => {
  // Connection URI - use environment variable or default local connection
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/community_feedback';
  
  // Connection options to avoid deprecation warnings
  const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // 5 seconds timeout instead of 30s default
  };

  try {
    logWithTimestamp('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    logWithTimestamp('✅ MongoDB connected successfully!');
    
    // Get connection status
    const state = mongoose.connection.readyState;
    const stateMessages = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };
    
    logWithTimestamp(`Connection state: ${stateMessages[state]} (${state})`);
    
    // Get database stats
    const db = mongoose.connection.db;
    const stats = await db.stats();
    logWithTimestamp('\nDatabase Information:');
    logWithTimestamp(`Database name: ${db.databaseName}`);
    logWithTimestamp(`Collections: ${stats.collections}`);
    logWithTimestamp(`Documents: ${stats.objects}`);
    logWithTimestamp(`Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
    return true;
  } catch (error) {
    logError('MongoDB connection error', error);
    
    if (error.name === 'MongoServerSelectionError') {
      logWithTimestamp('\nPossible causes:');
      logWithTimestamp('1. MongoDB service is not running');
      logWithTimestamp('2. Connection URI is incorrect');
      logWithTimestamp('3. Network issues or firewall blocking the connection');
      logWithTimestamp('\nTroubleshooting steps:');
      logWithTimestamp('1. Make sure MongoDB is installed and running:');
      logWithTimestamp('   - For local MongoDB: run "mongod" in a terminal');
      logWithTimestamp('   - For MongoDB Atlas: check your network connection and whitelist your IP');
      logWithTimestamp('2. Verify your connection string in the .env file');
    }
    
    // Don't exit process - allow server to run even if DB connection fails initially
    // This lets you fix the connection without restarting the server
    return false;
  }
};

// Create Feedback Schema
const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  userType: String,
  satisfactionScore: Number,
  responsiveness: Number,
  quality: Number,
  moderation: Number,
  improvements: String,
  likes: String,
  suggestions: String,
  topics: [String],
  contactPermission: Boolean,
  anonymous: Boolean,
  category: String,  // added new
  autoResponse: String, // added new
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Create test schema for connection testing
const TestSchema = new mongoose.Schema({
  name: String,
  createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('ConnectionTest', TestSchema);

// Test database connection endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    
    // Test write operation
    logWithTimestamp('Testing database write operation...');
    const testDoc = new TestModel({ 
      name: `Test Document ${new Date().toISOString()}` 
    });
    
    await testDoc.save();
    logWithTimestamp(`✅ Test document created with ID: ${testDoc._id}`);
    
    // Test read operation
    logWithTimestamp('Testing database read operation...');
    const retrievedDoc = await TestModel.findById(testDoc._id);
    logWithTimestamp(`✅ Retrieved document: ${retrievedDoc.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Database connection test successful',
      connectionState: mongoose.connection.readyState,
      databaseName: mongoose.connection.db.databaseName,
      testDocumentId: testDoc._id
    });
  } catch (error) {
    logError('Connection test error', error);
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      error: error.message
    });
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Analytics endpoint (for admin dashboard)
app.get('/api/feedback/analytics', async (req, res) => {
  try {
    // Check MongoDB connection before proceeding
    if (mongoose.connection.readyState !== 1) {
      logWithTimestamp('Database not connected. Attempting to reconnect...');
      const connected = await connectDB();
      if (!connected) {
        return res.status(500).json({
          success: false,
          message: 'Database connection unavailable. Please try again later.'
        });
      }
    }
    
    const totalResponses = await Feedback.countDocuments();
    const averageSatisfaction = await Feedback.aggregate([
      { $group: { _id: null, avg: { $avg: "$satisfactionScore" } } }
    ]);
    
    const userTypeDistribution = await Feedback.aggregate([
      { $group: { _id: "$userType", count: { $sum: 1 } } }
    ]);
    
    const topicInterests = await Feedback.aggregate([
      { $unwind: "$topics" },
      { $group: { _id: "$topics", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      totalResponses,
      averageSatisfaction: averageSatisfaction[0]?.avg || 0,
      userTypeDistribution,
      topicInterests
    });
  } catch (error) {
    logError('Error fetching analytics', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching analytics'
    });
  }
});

app.post('/api/feedback', async (req, res) => {
  logWithTimestamp('Received feedback submission');
  
  try {
    // Check MongoDB connection before proceeding
    if (mongoose.connection.readyState !== 1) {
      logWithTimestamp('Database not connected. Attempting to reconnect...');
      const connected = await connectDB();
      if (!connected) {
        return res.status(500).json({
          success: false,
          message: 'Database connection unavailable. Please try again later.'
        });
      }
    }
    
    // Validate required fields
    if (!req.body.userType) {
      return res.status(400).json({
        success: false,
        message: 'User type is required'
      });
    }
    
    // If anonymous is true, remove personal information
    let feedbackData = {...req.body};
    if (feedbackData.anonymous) {
      feedbackData.name = '';
      feedbackData.email = '';
    }
    
    // Log the received data for debugging
    logWithTimestamp(`Feedback data received: ${JSON.stringify(feedbackData)}`);
    
    let category = 'Uncategorized';
    let autoResponse = 'Thank you for your feedback. Our team will review it shortly.';
    
    try {
      // Categorize feedback using Gemini
      logWithTimestamp('Attempting to categorize feedback with Gemini...');
      category = await categorizeFeedback(feedbackData);
      feedbackData.category = category;
      
      // Generate auto-response
      logWithTimestamp('Generating auto-response with Gemini...');
      autoResponse = await generateResponse(feedbackData, category);
      feedbackData.autoResponse = autoResponse;
    } catch (aiError) {
      // If AI processing fails, continue with default values but log error
      logError('Error processing feedback with Gemini', aiError);
      feedbackData.category = category;
      feedbackData.autoResponse = autoResponse;
    }
    
    // Save feedback to database
    const newFeedback = new Feedback(feedbackData);
    await newFeedback.save();
    
    logWithTimestamp(`Feedback saved successfully: ${newFeedback._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: newFeedback._id,
        category: category,
        autoResponse: autoResponse
      }
    });
  } catch (error) {
    logError('Error saving feedback', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while saving your feedback'
    });
  }
});


app.use((err, req, res, next) => {
  logError('Unhandled error', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred'
  });
});

// Initialize the server
async function startServer() {
  // Try to connect to MongoDB first
  await connectDB();
  
  // Start server even if MongoDB connection fails
  app.listen(PORT, () => {
    logWithTimestamp(`Server running on http://localhost:${PORT}`);
  });
}

// Start the server
startServer();