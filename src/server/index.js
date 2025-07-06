const app = require('./app');
const connectDB = require('../config/database');

const PORT = process.env.PORT || 3000;

// Connect to database and start server
const startServer = async () => {
  try {

    // Connect to MongoDB
    await connectDB();

    console.log(`🔑 PORT: ${PORT}`);

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log('📝 API Documentation available at /api-docs');
      console.log('💚 Health check available at /health');
      console.log('----------------------------------------');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

module.exports = { startServer }; 