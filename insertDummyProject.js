const supabase = require("./config/supabase");

const seedProjects = async () => {
  const dummyProjects = [
    { user_id: "55006958", title: "mike dean inspired rnb beat", hashtags: ["rnb", "mike dean", "808"] },
    { user_id: "55006958", title: "hard trap beat", hashtags: ["trap", "hard", "808"] },
    { user_id: "55006958", title: "chill lofi beat", hashtags: ["lofi", "chill", "piano"] },
    { user_id: "55006958", title: "dark drill beat", hashtags: ["drill", "dark", "808"] },
    { user_id: "55006958", title: "melodic trap beat", hashtags: ["trap", "melodic", "piano"] },
  ];

  try {
    const { data, error } = await supabase.from("Project").insert(dummyProjects);

    if (error) {
      console.error("Error inserting dummy projects:", error);
    } else {
      console.log("Dummy projects inserted successfully:", data);
    }
  } catch (err) {
    console.error("Unexpected error:", err.message);
  }
};

seedProjects();