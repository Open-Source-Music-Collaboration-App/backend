const express = require("express");
const router = express.Router();
const supabase = require("../services/supabase");
const passport = require("../utils/passport");

// Use a middleware function that actually exists
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Get user profile and statistics
router.get("/:userId", isAuthenticated, async (req, res) => {
  console.log("Fetching profile for user:", req.params.userId);
  try {
    const userId = req.params.userId;
    
    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (userError) throw userError;
    
    // Fetch user's projects
    const { data: projects, error: projectsError } = await supabase
      .from("Project")
      .select("*, User(name)")
      .eq("user_id", userId);
      
    if (projectsError) throw projectsError;
    
    // Fetch feature requests created by user
    const { data: features, error: featuresError } = await supabase
      .from("Feature")
      .select("*")
      .eq("author_id", userId);


    //since every features contains a priority which is either high, medium, or low 
    // we can use this to get the number of features by priority
    let highCount = features.filter(f => f.priority === 'high').length;
    let mediumCount = features.filter(f => f.priority === 'medium').length;
    let lowCount = features.filter(f => f.priority === 'low').length;

    features.byPriority = {
      high: highCount,
      medium: mediumCount,
      low: lowCount
    };
      
    if (featuresError) throw featuresError;

    
    // Fetch collaborations initiated by user
    const { data: collabs, error: collabError } = await supabase
        .from('Collab')
        .select('*, Project (title)')
        .eq('author_id', userId)
      
    // console.log("Collab data:", collabs);

    if (collabError) throw collabError;
    
    // Fetch user's comments
    const { data: comments, error: commentsError } = await supabase
      .from("Comment")
      .select("*")
      .eq("author_id", userId);
      
    if (commentsError) throw commentsError;
    
    // Fetch projects statistics
    const projectStats = {
      total: projects.length,
      public: projects.filter(p => p.visibility === 'public'),
      private: projects.filter(p => p.visibility === 'private'),
      projects: projects,
      recentActivity: projects.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      ).slice(0, 5),
      mostUsedTags: getMostUsedTags(projects)
    };
    
    // Feature stats
    const featureStats = {
      created: features.length,
      open: features.filter(f => f.open).length,
      closed: features.filter(f => !f.open).length,
      byPriority: {
        high: features.filter(f => f.priority === 'high').length,
        medium: features.filter(f => f.priority === 'medium').length,
        low: features.filter(f => f.priority === 'low').length
      },
      features: features
    };
    
    // Collaboration statistics
    const collabStats = {
      total: collabs.length,
      pending: collabs.filter(c => c.status === 'pending').length,
      accepted: collabs.filter(c => c.status === 'accepted').length,
      rejected: collabs.filter(c => c.status === 'rejected').length,
      collabs: collabs
    };
    
    // Comment statistics
    const commentStats = {
      total: comments.length,
      byFeature: getCommentsByFeature(comments),
      comments: comments
    };
    
    // User engagement score - a simple metric based on activity
    const engagementScore = calculateEngagementScore({
      projectCount: projects.length,
      featureCount: features.length,
      collabCount: collabs.length,
      commentCount: comments.length
    });

    console.log("User profile and stats fetched successfully");
    
    // Calculate user activity over time (last 6 months)
    const activityData = calculateActivityData(projects, features, collabs, comments);
    
    res.status(200).json({
      user,
      stats: {
        projects: projectStats,
        features: featureStats,
        collabs: collabStats,
        comments: commentStats,
        activityData,
        engagementScore
      }
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Failed to fetch profile data" });
  }
});

// Helper function to calculate activity data (expanded)
function calculateActivityData(projects, features, collabs = [], comments = []) {
  const months = [];
  const now = new Date();
  
  // Get last 6 months
  for (let i = 0; i < 6; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.unshift({
      month: month.toLocaleString('default', { month: 'short' }),
      year: month.getFullYear(),
      value: month
    });
  }
  
  // Map activity to months
  return months.map(month => {
    const nextMonth = new Date(month.value);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const projectActivity = projects.filter(p => {
      const date = new Date(p.updated_at);
      return date >= month.value && date < nextMonth;
    }).length;
    
    const featureActivity = features.filter(f => {
      const date = new Date(f.created_at);
      return date >= month.value && date < nextMonth;
    }).length;
    
    const collabActivity = collabs.filter(c => {
      const date = new Date(c.created_at);
      return date >= month.value && date < nextMonth;
    }).length;
    
    const commentActivity = comments.filter(c => {
      const date = new Date(c.created_at);
      return date >= month.value && date < nextMonth;
    }).length;
    
    return {
      month: `${month.month} ${month.year}`,
      projects: projectActivity,
      features: featureActivity,
      collabs: collabActivity,
      comments: commentActivity,
      total: projectActivity + featureActivity + collabActivity + commentActivity
    };
  });
}

// Helper function to calculate engagement score
function calculateEngagementScore({ projectCount, featureCount, collabCount, commentCount }) {
  // Weight factors can be adjusted as needed
  const projectWeight = 10;
  const featureWeight = 5;
  const collabWeight = 8;
  const commentWeight = 2;
  
  return Math.round(
    (projectCount * projectWeight) + 
    (featureCount * featureWeight) + 
    (collabCount * collabWeight) + 
    (commentCount * commentWeight)
  );
}

// Get most used tags across all projects
function getMostUsedTags(projects) {
  const tagCounts = {};
  
  projects.forEach(project => {
    if (project.hashtags && Array.isArray(project.hashtags)) {
      project.hashtags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// Group comments by feature
function getCommentsByFeature(comments) {
  const featureMap = {};
  
  comments.forEach(comment => {
    if (!featureMap[comment.feature_id]) {
      featureMap[comment.feature_id] = [];
    }
    featureMap[comment.feature_id].push(comment);
  });
  
  return Object.entries(featureMap).map(([featureId, comments]) => ({
    featureId,
    count: comments.length,
    comments
  }));
}

module.exports = router;