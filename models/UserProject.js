const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserProject = sequelize.define("UserProject", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.STRING, // GitHub username or user ID
    allowNull: false,
  },
  userId: {
    type: DataTypes.STRING, // User authentication ID (for security)
    allowNull: false,
  },
  hashtags: {
    type: DataTypes.ARRAY(DataTypes.STRING), // Store hashtags as an array
    allowNull: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

module.exports = UserProject;