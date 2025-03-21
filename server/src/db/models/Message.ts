// server/src/db/models/Message.ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config';
import Conversation from './Conversation';
import { RoleType } from '../../types/agent';

interface MessageAttributes {
  id: string;
  conversationId: string;
  role: RoleType;
  content?: string;
  toolCalls?: object[];
  toolCallId?: string;
  name?: string;
  createdAt?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'createdAt'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: string;
  public conversationId!: string;
  public role!: RoleType;
  public content?: string;
  public toolCalls?: object[];
  public toolCallId?: string;
  public name?: string;
  
  public readonly createdAt!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('system', 'user', 'assistant', 'tool'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    toolCalls: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    toolCallId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
    updatedAt: false,
  }
);

// Define associations
Message.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
});

export default Message;