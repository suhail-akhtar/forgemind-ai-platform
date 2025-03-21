// server/src/db/models/User.ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config';
import bcrypt from 'bcrypt';

interface UserAttributes {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public passwordHash!: string;
  public name!: string;
  public apiKey?: string;
  public model?: string;
  public maxTokens?: number;
  public temperature?: number;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Verify password
  public async verifyPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }
  
  // Hash a password before saving
  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    apiKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'gpt-4o',
    },
    maxTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2000,
    },
    temperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.7,
    },
  },
  {
    sequelize,
    tableName: 'users',
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.changed('passwordHash')) {
          user.passwordHash = await User.hashPassword(user.passwordHash);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('passwordHash')) {
          user.passwordHash = await User.hashPassword(user.passwordHash);
        }
      },
    },
  }
);

export default User;