import app from './app.js';
import connectDB from '../config/database.js';
import { testCloudinaryConnection } from '../config/cloudinary.js';

const PORT = process.env.PORT || 3000;

// Connect to database and start server
const startServer = async () => {
  try {

    // Connect to MongoDB
    await connectDB();

    // Test Cloudinary connection
    await testCloudinaryConnection();

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

export { startServer }; 