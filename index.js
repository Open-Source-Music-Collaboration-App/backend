require('dotenv').config();
const app = require('./app')

const PORT = process.env.PORT || 3333;
// const sequelize = require("./config/database");

// async function startServer() {
//   try {
//     await sequelize.authenticate();
//     console.log("Connected to PostgreSQL");

//     await sequelize.sync({ alter: true }); 
//     console.log("Database synced");

//     app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//   } catch (err) {
//     console.error("Error connecting to database:", err);
//   }
// }
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// startServer();