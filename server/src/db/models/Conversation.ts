// server/src/db/models/Conversation.ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config';
import User from './User';

interface ConversationAttributes {
  id: string;
  userId: number;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConversationCreationAttributes extends Optional<ConversationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> implements ConversationAttributes {
  public id!: string;
  public userId!: number;
  public title!: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Conversation.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'conversations',
  }
);

// Define associations
Conversation.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

export default Conversation;