const { Sequelize } = require("sequelize");

// Load environment variables from .env file
require("dotenv").config();

// PostgreSQL connection configuration
const sequelize = new Sequelize(
  process.env.DB_NAME,     // Database name
  process.env.DB_USER,     // Database user
  process.env.DB_PASSWORD, // Database password
  {
    host: process.env.DB_HOST, 
    dialect: "postgres", 
    logging: false 
  }
);

module.exports = sequelize;