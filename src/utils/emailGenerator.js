/**
 * Email Generation Utility
 * Handles creation of unique @rentalease.com.au email addresses
 */

import SuperUser from "../models/SuperUser.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import TeamMember from "../models/TeamMember.js";
import Technician from "../models/Technician.js";

class EmailGenerator {
  /**
   * Check if email exists across all user models
   */
  async emailExists(email) {
    // Check all models in parallel for performance
    const checks = await Promise.all([
      SuperUser.findOne({ systemEmail: email }),
      Agency.findOne({ systemEmail: email }),
      PropertyManager.findOne({ systemEmail: email }),
      TeamMember.findOne({ systemEmail: email }),
      Technician.findOne({ systemEmail: email })
    ]);
    
    return checks.some(result => result !== null);
  }

  /**
   * Generate email for individual users (first.last pattern)
   */
  async generateUserEmail(firstName, lastName) {
    // Clean and normalize names
    const first = firstName
      .toLowerCase()
      .replace(/[^a-z]/g, '') // Remove non-letters
      .trim();
    
    const last = lastName
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .trim();
    
    // Handle edge cases
    if (!first || !last) {
      throw new Error('Valid first and last names are required for email generation');
    }
    
    let baseEmail = `${first}.${last}@rentalease.com.au`;
    let finalEmail = baseEmail;
    let counter = 1;
    
    // Keep trying until we find a unique email
    while (await this.emailExists(finalEmail)) {
      finalEmail = `${first}.${last}${counter}@rentalease.com.au`;
      counter++;
      
      // Safety check to prevent infinite loop
      if (counter > 99) {
        throw new Error('Unable to generate unique email after 99 attempts');
      }
    }
    
    console.log(`📧 Generated email: ${finalEmail} for ${firstName} ${lastName}`);
    return finalEmail;
  }

  /**
   * Generate email for agencies (company-name pattern)
   */
  async generateAgencyEmail(companyName) {
    // Clean and normalize company name
    const sanitized = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Keep letters, numbers, spaces
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .trim();
    
    if (!sanitized) {
      throw new Error('Valid company name is required for email generation');
    }
    
    // Truncate if too long (max 50 chars for local part)
    const truncated = sanitized.substring(0, 50);
    
    let baseEmail = `${truncated}@rentalease.com.au`;
    let finalEmail = baseEmail;
    let counter = 1;
    
    while (await this.emailExists(finalEmail)) {
      finalEmail = `${truncated}${counter}@rentalease.com.au`;
      counter++;
      
      if (counter > 99) {
        throw new Error('Unable to generate unique email after 99 attempts');
      }
    }
    
    console.log(`📧 Generated agency email: ${finalEmail} for ${companyName}`);
    return finalEmail;
  }

  /**
   * Generate email based on user type
   */
  async generateSystemEmail(userData, userType) {
    try {
      switch (userType) {
        case 'SuperUser':
          // SuperUsers use their name
          const nameParts = userData.name.split(' ');
          const firstName = nameParts[0] || 'admin';
          const lastName = nameParts[nameParts.length - 1] || 'user';
          return await this.generateUserEmail(firstName, lastName);
        
        case 'Agency':
          // Agencies use company name
          return await this.generateAgencyEmail(userData.companyName);
        
        case 'PropertyManager':
          // Property managers use first.last pattern
          return await this.generateUserEmail(userData.firstName, userData.lastName);
        
        case 'TeamMember':
          // Team members use their name
          const memberParts = userData.name.split(' ');
          const memberFirst = memberParts[0] || 'team';
          const memberLast = memberParts[memberParts.length - 1] || 'member';
          return await this.generateUserEmail(memberFirst, memberLast);
        
        case 'Technician':
          // Technicians use first.last pattern
          return await this.generateUserEmail(userData.firstName, userData.lastName);
        
        default:
          throw new Error(`Unknown user type: ${userType}`);
      }
    } catch (error) {
      console.error('❌ Error generating system email:', error);
      throw error;
    }
  }

  /**
   * Update existing user with system email
   */
  async assignSystemEmail(userId, userType) {
    try {
      let user;
      let Model;
      
      // Get the appropriate model
      switch (userType) {
        case 'SuperUser':
          Model = SuperUser;
          break;
        case 'Agency':
          Model = Agency;
          break;
        case 'PropertyManager':
          Model = PropertyManager;
          break;
        case 'TeamMember':
          Model = TeamMember;
          break;
        case 'Technician':
          Model = Technician;
          break;
        default:
          throw new Error(`Unknown user type: ${userType}`);
      }
      
      // Find the user
      user = await Model.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Skip if already has system email
      if (user.systemEmail) {
        console.log(`✅ User already has system email: ${user.systemEmail}`);
        return user.systemEmail;
      }
      
      // Generate and assign email
      const systemEmail = await this.generateSystemEmail(user, userType);
      user.systemEmail = systemEmail;
      await user.save();
      
      console.log(`✅ Assigned system email ${systemEmail} to ${userType} ${userId}`);
      return systemEmail;
    } catch (error) {
      console.error('❌ Error assigning system email:', error);
      throw error;
    }
  }

  /**
   * Bulk assign emails to all existing users (migration helper)
   */
  async migrateExistingUsers() {
    console.log('🔄 Starting system email migration for existing users...');
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each user type
    const migrations = [
      { Model: SuperUser, type: 'SuperUser' },
      { Model: Agency, type: 'Agency' },
      { Model: PropertyManager, type: 'PropertyManager' },
      { Model: TeamMember, type: 'TeamMember' },
      { Model: Technician, type: 'Technician' }
    ];
    
    for (const { Model, type } of migrations) {
      console.log(`\n📋 Processing ${type}s...`);
      
      const users = await Model.find({ systemEmail: { $exists: false } });
      console.log(`Found ${users.length} ${type}s without system email`);
      
      for (const user of users) {
        try {
          const email = await this.assignSystemEmail(user._id, type);
          console.log(`✅ ${type} ${user._id}: ${email}`);
          results.success++;
        } catch (error) {
          console.error(`❌ Failed for ${type} ${user._id}:`, error.message);
          results.failed++;
          results.errors.push({
            type,
            userId: user._id,
            error: error.message
          });
        }
      }
    }
    
    // Count users that already had emails
    for (const { Model, type } of migrations) {
      const withEmail = await Model.countDocuments({ systemEmail: { $exists: true, $ne: null } });
      const total = await Model.countDocuments();
      if (withEmail < total) {
        results.skipped += (total - withEmail - users.length);
      }
    }
    
    console.log('\n📊 Migration Results:');
    console.log(`✅ Success: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️ Skipped (already had email): ${results.skipped}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(err => {
        console.log(`  - ${err.type} ${err.userId}: ${err.error}`);
      });
    }
    
    return results;
  }
}

// Export singleton instance
const emailGenerator = new EmailGenerator();
export default emailGenerator;