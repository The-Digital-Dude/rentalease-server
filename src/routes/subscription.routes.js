import express from "express";
import mongoose from "mongoose";
import Agency from "../models/Agency.js";
import Property from "../models/Property.js";
import Contact from "../models/Contact.js";
import PropertyManager from "../models/PropertyManager.js";
import Job from "../models/Job.js";
import { stripe, STRIPE_PLANS } from "../config/stripe.js";
import emailService from "../services/email.service.js";
import jwt from "jsonwebtoken";
import {
  authenticateAgency,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Valid regions enum
const VALID_REGIONS = [
  "Sydney Metro",
  "Melbourne Metro",
  "Brisbane Metro",
  "Perth Metro",
  "Adelaide Metro",
  "Darwin Metro",
  "Hobart Metro",
  "Canberra Metro",
  "Regional NSW",
  "Regional VIC",
  "Regional QLD",
  "Regional WA",
  "Regional SA",
  "Regional NT",
  "Regional TAS",
];

// Create Stripe customer and subscription for agency self-registration
router.post("/register-with-subscription", async (req, res) => {
  try {
    const {
      companyName,
      abn,
      contactPerson,
      email,
      phone,
      region,
      compliance,
      password,
      planType, // 'starter', 'pro', 'enterprise'
      billingPeriod = "monthly"
    } = req.body;

    // Validate required fields
    if (
      !companyName ||
      !abn ||
      !contactPerson ||
      !email ||
      !phone ||
      !region ||
      !compliance ||
      !password ||
      !planType
    ) {
      return res.status(400).json({
        status: "error",
        message: "All fields including plan type are required",
      });
    }

    // Validate plan type
    if (!["starter", "pro", "enterprise"].includes(planType)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid plan type. Must be starter, pro, or enterprise",
      });
    }

    // Enterprise plans require custom handling
    if (planType === "enterprise") {
      return res.status(400).json({
        status: "error",
        message: "Enterprise plans require custom setup. Please contact sales.",
      });
    }

    // Validate region
    if (!VALID_REGIONS.includes(region)) {
      return res.status(400).json({
        status: "error",
        message: "Please select a valid region",
      });
    }

    // Check if agency already exists by email
    const existingAgencyByEmail = await Agency.findOne({
      email: email.toLowerCase(),
    });
    if (existingAgencyByEmail) {
      return res.status(400).json({
        status: "error",
        message: "Agency with this email already exists",
      });
    }

    // Check if agency already exists by ABN
    const existingAgencyByABN = await Agency.findOne({ abn });
    if (existingAgencyByABN) {
      return res.status(400).json({
        status: "error",
        message: "Agency with this ABN already exists",
      });
    }

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email: email.toLowerCase(),
      name: `${companyName} - ${contactPerson}`,
      metadata: {
        companyName,
        abn,
        contactPerson,
        region,
        compliance,
      },
    });

    // Get plan configuration
    const planConfig = STRIPE_PLANS[planType];

    // Create Stripe product first
    const stripeProduct = await stripe.products.create({
      name: planConfig.name,
      description: `RentalEase CRM ${planConfig.name} - ${planConfig.features.slice(0, 3).join(', ')}`,
      metadata: {
        planType,
      },
    });

    // Create Stripe price for the plan
    const stripePrice = await stripe.prices.create({
      unit_amount: planConfig.price,
      currency: 'aud',
      recurring: {
        interval: billingPeriod === "yearly" ? "year" : "month",
      },
      product: stripeProduct.id,
      metadata: {
        planType,
        billingPeriod,
      },
    });

    // Create agency with pending subscription
    const agency = new Agency({
      companyName,
      abn,
      contactPerson,
      email: email.toLowerCase(),
      phone,
      region,
      compliance,
      password,
      status: "Pending", // Will be activated after successful payment
      stripeCustomerId: stripeCustomer.id,
      planType,
      billingPeriod,
      subscriptionStatus: "incomplete",
    });

    await agency.save();

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.WEBSITE_URL || 'http://localhost:3001'}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.WEBSITE_URL || 'http://localhost:3001'}/subscription-cancelled`,
      metadata: {
        agencyId: agency._id.toString(),
        planType,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          agencyId: agency._id.toString(),
          planType,
        },
        trial_period_days: 14, // 14-day free trial
      },
    });

    console.log("Agency created with pending subscription:", {
      agencyId: agency._id,
      companyName: agency.companyName,
      email: agency.email,
      stripeCustomerId: stripeCustomer.id,
      checkoutSessionId: checkoutSession.id,
      planType,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      status: "success",
      message: "Agency created. Please complete payment to activate your subscription.",
      data: {
        agency: {
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          planType: agency.planType,
          status: agency.status,
        },
        checkout: {
          sessionId: checkoutSession.id,
          url: checkoutSession.url,
        },
      },
    });
  } catch (error) {
    console.error("Agency subscription registration error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "An error occurred during registration",
    });
  }
});

// Stripe webhook handler
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Handle successful checkout completion
async function handleCheckoutCompleted(session) {
  const agencyId = session.metadata.agencyId;

  if (!agencyId) {
    console.error('No agency ID found in checkout session metadata');
    return;
  }

  try {
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      console.error(`Agency not found for ID: ${agencyId}`);
      return;
    }

    // Activate the agency
    agency.status = "active";
    agency.subscriptionStatus = "trial"; // Starts with trial
    agency.paymentStatus = "completed"; // Payment completed successfully
    agency.subscriptionStartDate = new Date();

    // Set trial end date (14 days from now)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    agency.trialEndsAt = trialEnd;

    await agency.save();

    // Send welcome email with login credentials
    try {
      await emailService.sendAgencyWelcomeEmail({
        email: agency.email,
        name: agency.contactPerson,
        contactPerson: agency.contactPerson,
        companyName: agency.companyName,
        subscriptionAmount: agency.subscriptionAmount,
        trialEndDate: trialEnd,
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      });

      console.log("Welcome email sent to activated agency:", {
        agencyId: agency._id,
        email: agency.email,
        companyName: agency.companyName,
        subscriptionAmount: agency.subscriptionAmount,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    console.log("Agency activated successfully:", {
      agencyId: agency._id,
      email: agency.email,
      companyName: agency.companyName,
      planType: agency.planType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
  const agencyId = subscription.metadata.agencyId;
  
  if (!agencyId) {
    console.error('No agency ID found in subscription metadata');
    return;
  }

  try {
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      console.error(`Agency not found for ID: ${agencyId}`);
      return;
    }

    agency.subscriptionId = subscription.id;
    agency.subscriptionStatus = subscription.status;
    
    if (subscription.trial_end) {
      agency.trialEndsAt = new Date(subscription.trial_end * 1000);
    }

    await agency.save();
    
    console.log("Subscription created for agency:", {
      agencyId: agency._id,
      subscriptionId: subscription.id,
      status: subscription.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  const agencyId = subscription.metadata.agencyId;
  
  if (!agencyId) {
    // Try to find agency by subscription ID
    const agency = await Agency.findOne({ subscriptionId: subscription.id });
    if (!agency) {
      console.error('No agency found for subscription:', subscription.id);
      return;
    }
    
    agency.subscriptionStatus = subscription.status;
    
    if (subscription.current_period_end) {
      agency.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    }

    await agency.save();
    
    console.log("Subscription updated for agency:", {
      agencyId: agency._id,
      subscriptionId: subscription.id,
      status: subscription.status,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription) {
  try {
    const agency = await Agency.findOne({ subscriptionId: subscription.id });
    if (!agency) {
      console.error('No agency found for subscription:', subscription.id);
      return;
    }

    agency.subscriptionStatus = "canceled";
    agency.status = "inactive"; // Deactivate agency
    agency.subscriptionEndDate = new Date();

    await agency.save();
    
    console.log("Subscription cancelled for agency:", {
      agencyId: agency._id,
      subscriptionId: subscription.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

// Handle successful payment
async function handlePaymentSucceeded(invoice) {
  if (invoice.billing_reason === 'subscription_cycle') {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const agency = await Agency.findOne({ subscriptionId: subscription.id });
      
      if (agency) {
        agency.subscriptionStatus = 'active';
        if (subscription.current_period_end) {
          agency.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        }
        await agency.save();
        
        console.log("Payment succeeded for agency:", {
          agencyId: agency._id,
          subscriptionId: subscription.id,
          amount: invoice.amount_paid / 100,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const agency = await Agency.findOne({ subscriptionId: subscription.id });
    
    if (agency) {
      agency.subscriptionStatus = 'past_due';
      await agency.save();
      
      console.log("Payment failed for agency:", {
        agencyId: agency._id,
        subscriptionId: subscription.id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Get subscription status for agency and team members
router.get("/status", authenticateUserTypes(['SuperUser', 'Agency', 'TeamMember']), async (req, res) => {
  try {
    // Get agency ID based on user type
    let agencyId;
    if (req.user && req.user.type === 'SuperUser') {
      // For super users, get agency ID from request body, params, or query
      agencyId = req.body.agencyId || req.params.id || req.params.agencyId || req.query.agencyId;
      if (!agencyId) {
        return res.status(400).json({
          status: "error",
          message: "Agency ID is required for super user requests. Please provide agencyId in request body.",
        });
      }
    } else if (req.user && req.user.type === 'TeamMember') {
      // For team members, get their associated agency from the database
      const TeamMember = (await import("../models/TeamMember.js")).default;
      const teamMember = await TeamMember.findById(req.user.id).populate('agency');
      if (!teamMember || !teamMember.agency) {
        return res.status(400).json({
          status: "error",
          message: "Team member agency not found",
        });
      }
      agencyId = teamMember.agency._id;
    } else if (req.agency) {
      agencyId = req.agency.id;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine agency",
      });
    }

    const agency = await Agency.findById(agencyId);
    
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found",
      });
    }

    let subscriptionDetails = null;
    if (agency.subscriptionId) {
      try {
        subscriptionDetails = await stripe.subscriptions.retrieve(agency.subscriptionId);
      } catch (stripeError) {
        console.error("Error fetching subscription from Stripe:", stripeError);
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        subscription: {
          status: agency.subscriptionStatus,
          planType: agency.planType,
          subscriptionAmount: agency.subscriptionAmount,
          billingPeriod: agency.billingPeriod,
          subscriptionStartDate: agency.subscriptionStartDate,
          subscriptionEndDate: agency.subscriptionEndDate,
          trialEndsAt: agency.trialEndsAt,
          paymentLinkUrl: agency.paymentLinkUrl,
          paymentStatus: agency.paymentStatus,
          limits: agency.getPlanLimits(),
          currentUsage: {
            properties: agency.totalProperties || 0,
          },
          canCreateProperty: agency.canCreateProperty(),
          hasActiveSubscription: agency.hasActiveSubscription(),
        },
        stripe: subscriptionDetails ? {
          currentPeriodStart: new Date(subscriptionDetails.current_period_start * 1000),
          currentPeriodEnd: new Date(subscriptionDetails.current_period_end * 1000),
          cancelAtPeriodEnd: subscriptionDetails.cancel_at_period_end,
        } : null,
      },
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching subscription status",
    });
  }
});

// Get analytics data for agency (accessible by agency and team members)
router.get("/analytics", authenticateUserTypes(['SuperUser', 'Agency', 'TeamMember']), async (req, res) => {
  try {
    // Get agency ID based on user type
    let agencyId;
    if (req.user && req.user.type === 'TeamMember') {
      agencyId = req.user.agencyId || req.user.id;
    } else if (req.agency) {
      agencyId = req.agency.id;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine agency",
      });
    }
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    // Get total all-time properties for this agency
    const totalProperties = await Property.countDocuments({ agency: agencyId, isActive: true });

    // Get total all-time property managers for this agency
    const totalPropertyManagers = await PropertyManager.countDocuments({ 
      'owner.ownerType': 'Agency', 
      'owner.ownerId': agencyId,
      status: { $in: ['Active', 'Inactive'] } // Exclude only suspended/pending
    });

    // Get total all-time completed jobs for this agency's properties
    const totalCompletedJobs = await Job.aggregate([
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      {
        $match: {
          'propertyData.agency': new mongoose.Types.ObjectId(agencyId),
          status: 'Completed'
        }
      },
      {
        $count: 'totalCompleted'
      }
    ]);

    const completedJobsCount = totalCompletedJobs.length > 0 ? totalCompletedJobs[0].totalCompleted : 0;

    // Calculate trends (comparing this month vs last month)
    const propertiesThisMonth = await Property.countDocuments({
      agency: agencyId,
      isActive: true,
      createdAt: { $gte: oneMonthAgo }
    });
    
    const propertiesLastMonth = await Property.countDocuments({
      agency: agencyId,
      isActive: true,
      createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo }
    });

    const propertyManagersThisMonth = await PropertyManager.countDocuments({
      'owner.ownerType': 'Agency',
      'owner.ownerId': agencyId,
      status: 'Active',
      createdAt: { $gte: oneMonthAgo }
    });

    const propertyManagersLastMonth = await PropertyManager.countDocuments({
      'owner.ownerType': 'Agency',
      'owner.ownerId': agencyId,
      status: 'Active',
      createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo }
    });

    const completedJobsThisMonth = await Job.aggregate([
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      {
        $match: {
          'propertyData.agency': new mongoose.Types.ObjectId(agencyId),
          status: 'Completed',
          completedAt: { $gte: oneMonthAgo }
        }
      },
      {
        $count: 'totalCompleted'
      }
    ]);

    const completedJobsLastMonth = await Job.aggregate([
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      {
        $match: {
          'propertyData.agency': new mongoose.Types.ObjectId(agencyId),
          status: 'Completed',
          completedAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo }
        }
      },
      {
        $count: 'totalCompleted'
      }
    ]);

    const completedJobsThisMonthCount = completedJobsThisMonth.length > 0 ? completedJobsThisMonth[0].totalCompleted : 0;
    const completedJobsLastMonthCount = completedJobsLastMonth.length > 0 ? completedJobsLastMonth[0].totalCompleted : 0;

    // Calculate trends
    let propertiesTrend = 0;
    if (propertiesLastMonth > 0) {
      propertiesTrend = Math.round(((propertiesThisMonth - propertiesLastMonth) / propertiesLastMonth) * 100);
    } else if (propertiesThisMonth > 0) {
      propertiesTrend = 100;
    }

    let propertyManagersTrend = 0;
    if (propertyManagersLastMonth > 0) {
      propertyManagersTrend = Math.round(((propertyManagersThisMonth - propertyManagersLastMonth) / propertyManagersLastMonth) * 100);
    } else if (propertyManagersThisMonth > 0) {
      propertyManagersTrend = 100;
    }

    let completedJobsTrend = 0;
    if (completedJobsLastMonthCount > 0) {
      completedJobsTrend = Math.round(((completedJobsThisMonthCount - completedJobsLastMonthCount) / completedJobsLastMonthCount) * 100);
    } else if (completedJobsThisMonthCount > 0) {
      completedJobsTrend = 100;
    }

    // Get 30-day activity data (completed jobs per week)
    const weeklyActivity = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      
      const weekCompletedJobs = await Job.aggregate([
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'propertyData'
          }
        },
        {
          $match: {
            'propertyData.agency': new mongoose.Types.ObjectId(agencyId),
            status: 'Completed',
            completedAt: { $gte: weekStart, $lt: weekEnd }
          }
        },
        {
          $count: 'weeklyCompleted'
        }
      ]);
      
      const weekCount = weekCompletedJobs.length > 0 ? weekCompletedJobs[0].weeklyCompleted : 0;
      weeklyActivity.push(weekCount);
    }

    res.status(200).json({
      status: "success",
      data: {
        totalProperties: {
          value: totalProperties,
          trend: propertiesTrend,
          trendDirection: propertiesTrend > 0 ? 'positive' : propertiesTrend < 0 ? 'negative' : 'neutral'
        },
        totalPropertyManagers: {
          value: totalPropertyManagers,
          trend: propertyManagersTrend,
          trendDirection: propertyManagersTrend > 0 ? 'positive' : propertyManagersTrend < 0 ? 'negative' : 'neutral'
        },
        totalCompletedJobs: {
          value: completedJobsCount,
          trend: completedJobsTrend,
          trendDirection: completedJobsTrend > 0 ? 'positive' : completedJobsTrend < 0 ? 'negative' : 'neutral'
        },
        weeklyActivity
      },
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching analytics data",
    });
  }
});

// Create customer portal session for managing subscription (accessible by agency and team members)
router.post("/create-portal-session", authenticateUserTypes(['SuperUser', 'Agency', 'TeamMember']), async (req, res) => {
  try {
    // Get agency ID based on user type
    let agencyId;
    if (req.user && req.user.type === 'SuperUser') {
      // For super users, get agency ID from request body, params, or query
      agencyId = req.body.agencyId || req.params.id || req.params.agencyId || req.query.agencyId;
      if (!agencyId) {
        return res.status(400).json({
          status: "error",
          message: "Agency ID is required for super user requests. Please provide agencyId in request body.",
        });
      }
    } else if (req.user && req.user.type === 'TeamMember') {
      // For team members, get their associated agency from the database
      const TeamMember = (await import("../models/TeamMember.js")).default;
      const teamMember = await TeamMember.findById(req.user.id).populate('agency');
      if (!teamMember || !teamMember.agency) {
        return res.status(400).json({
          status: "error",
          message: "Team member agency not found",
        });
      }
      agencyId = teamMember.agency._id;
    } else if (req.agency) {
      agencyId = req.agency.id;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine agency",
      });
    }

    const agency = await Agency.findById(agencyId);
    
    if (!agency || !agency.stripeCustomerId) {
      return res.status(404).json({
        status: "error",
        message: "No subscription found for this agency",
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: agency.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription`,
    });

    res.status(200).json({
      status: "success",
      data: {
        url: portalSession.url,
      },
    });
  } catch (error) {
    console.error("Create portal session error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating portal session",
    });
  }
});

// Create checkout session for an existing agency to subscribe (accessible by agency and team members)
router.post("/create-checkout-session", authenticateUserTypes(['SuperUser', 'Agency', 'TeamMember']), async (req, res) => {
  try {
    const { planType, billingPeriod = 'monthly' } = req.body;
    // Get agency ID based on user type
    let agencyId;
    if (req.user && req.user.type === 'TeamMember') {
      agencyId = req.user.agencyId || req.user.id;
    } else if (req.agency) {
      agencyId = req.agency.id;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine agency",
      });
    }

    const agency = await Agency.findById(agencyId);

    if (!agency) {
      return res.status(404).json({ status: "error", message: "Agency not found" });
    }

    if (agency.subscriptionId && agency.subscriptionStatus === 'active') {
        return res.status(400).json({ status: "error", message: "Agency already has an active subscription" });
    }

    const planConfig = STRIPE_PLANS[planType];
    if (!planConfig) {
      return res.status(400).json({ status: "error", message: "Invalid plan type" });
    }

    const stripePrice = await stripe.prices.create({
      unit_amount: planConfig.price,
      currency: 'aud',
      recurring: {
        interval: billingPeriod === "yearly" ? "year" : "month",
      },
      product_data: {
          name: planConfig.name,
          description: `RentalEase CRM ${planConfig.name}`
      },
      metadata: {
        planType,
        billingPeriod,
      },
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: agency.stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription?subscription_success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription?subscription_cancelled=true`,
      metadata: {
        agencyId: agency._id.toString(),
        planType,
        billingPeriod,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          agencyId: agency._id.toString(),
          planType,
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: {
        url: checkoutSession.url,
      },
    });
  } catch (error) {
    console.error("Create checkout session error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating checkout session",
    });
  }
});

// Test endpoint to manually set subscription data for debugging (remove in production)
router.post("/test-set-subscription/:agencyEmail", async (req, res) => {
  try {
    const { agencyEmail } = req.params;
    const { planType = "pro", subscriptionStatus = "trial" } = req.body;

    const agency = await Agency.findOne({ email: agencyEmail.toLowerCase() });
    
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found with email: " + agencyEmail,
      });
    }

    // Set subscription data for testing
    agency.planType = planType;
    agency.subscriptionStatus = subscriptionStatus;
    agency.subscriptionStartDate = new Date();
    agency.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
    agency.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await agency.save();

    res.status(200).json({
      status: "success",
      message: "Subscription data set for testing",
      data: {
        agencyId: agency._id,
        email: agency.email,
        companyName: agency.companyName,
        planType: agency.planType,
        subscriptionStatus: agency.subscriptionStatus,
        subscriptionStartDate: agency.subscriptionStartDate,
        subscriptionEndDate: agency.subscriptionEndDate,
        trialEndsAt: agency.trialEndsAt,
      },
    });
  } catch (error) {
    console.error("Set subscription test data error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while setting subscription data",
    });
  }
});


// Get current user's subscription status
router.get("/status", authenticateUserTypes(['Agency']), async (req, res) => {
  try {
    const agencyId = req.user._id;
    const agency = await Agency.findById(agencyId);

    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found"
      });
    }

    res.json({
      status: "success",
      subscription: {
        status: agency.subscriptionStatus || "pending_payment",
        amount: agency.subscriptionAmount || 0,
        paymentLinkUrl: agency.paymentLinkUrl,
        trialEndsAt: agency.trialEndsAt,
        subscriptionStartDate: agency.subscriptionStartDate,
        paymentStatus: agency.paymentStatus
      }
    });

  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch subscription status",
      error: error.message
    });
  }
});


export default router;