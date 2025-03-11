const express = require("express");
const adminRouter = express.Router();
const supabase = require('../services/supabase');

// // Middleware to check if user has admin permissions
// const isAdmin = async (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.status(401).json({ error: "Authentication required" });
//   }
  
//   try {
//     // Check if user has admin role - adjust this query based on your database structure
//     const { data, error } = await supabase
//       .from('User')
//       .select('is_admin')
//       .eq('id', req.user.id)
//       .single();
      
//     if (error || !data || !data.is_admin) {
//       return res.status(403).json({ error: "Forbidden: Admin access required" });
//     }
    
//     next();
//   } catch (err) {
//     console.error("Admin check error:", err);
//     res.status(500).json({ error: "Failed to verify admin status" });
//   }
// };

// Get all users with their projects
adminRouter.get("/users", async (req, res) => {
  try {
    // First get all users
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (usersError) {
      console.error("Error fetching users:", usersError);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
    
    // For each user, get their projects
    const usersWithProjects = await Promise.all(users.map(async (user) => {
      const { data: projects, error: projectsError } = await supabase
        .from('Project')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (projectsError) {
        console.error(`Error fetching projects for user ${user.id}:`, projectsError);
        return { ...user, projects: [] };
      }
      
      return { ...user, projects };
    }));
    
    res.json(usersWithProjects);
  } catch (err) {
    console.error("Error in admin users endpoint:", err);
    res.status(500).json({ error: "Failed to fetch users and projects" });
  }
});

module.exports = adminRouter;