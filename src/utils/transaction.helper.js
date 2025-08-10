import mongoose from 'mongoose';

/**
 * Helper function to execute operations with or without transactions
 * based on MongoDB setup (replica set vs standalone)
 */
export const executeWithTransaction = async (operations) => {
  try {
    // Try to start a session - this will fail on standalone MongoDB
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      // Execute all operations with session
      const results = await operations(session);
      
      await session.commitTransaction();
      return results;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (sessionError) {
    // If session creation fails (standalone MongoDB), execute without transaction
    console.warn('MongoDB transactions not available (standalone mode). Executing without transactions.');
    return await operations(null);
  }
};

/**
 * Helper function to conditionally apply session to query
 */
export const withSession = (query, session) => {
  return session ? query.session(session) : query;
};