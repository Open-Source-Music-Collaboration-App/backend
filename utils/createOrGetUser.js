const supabase = require("../services/supabase");

/**
 * Creates a new user in the database if they don't already exist.
 * @param {string} userId - The unique ID of the user.
 * @param {string} username - The name of the user.
 * @returns {Promise<Object>} The user data (existing or newly created).
 */
const createOrGetUser = async (userId, username) => {
  if (!userId || !username) {
    return { error: "userId and username are required." };
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("User")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") { // Ignore "no rows" error
      console.error("Database Error:", fetchError);
      return { error: fetchError.message };
    }

    if (existingUser) {
      console.log("✅ User already exists:", existingUser);
      return { data: existingUser };
    }

    // Insert new user since they don't exist
    const { data: newUser, error: insertError } = await supabase
      .from("User")
      .insert([{ id: userId, name: username }])
      .select()
      .single();

    if (insertError) {
      console.error("Insert Error:", insertError);
      return { error: insertError.message };
    }

    console.log("✅ New user created:", newUser);
    return { data: newUser };
  } catch (err) {
    console.error("Unexpected Error:", err.message);
    return { error: err.message };
  }
};

module.exports = createOrGetUser;