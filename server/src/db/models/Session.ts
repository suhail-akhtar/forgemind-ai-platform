// server/src/db/models/Session.ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config';
import User from './User';

interface SessionAttributes {
  id: string;
  userId: number;
  createdAt?: Date;
  expiresAt: Date;
}

interface SessionCreationAttributes extends Optional<SessionAttributes, 'createdAt'> {}

class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: string;
  public userId!: number;
  public createdAt!: Date;
  public expiresAt!: Date;
  
  public static createToken(): string {
    // Generate a random UUID for session token
    return crypto.randomUUID();
  }
  
  public static createExpiryDate(daysValid: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysValid);
    return date;
  }
  
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

Session.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'sessions',
    timestamps: false,
  }
);

// Define associations
Session.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

export default Session;