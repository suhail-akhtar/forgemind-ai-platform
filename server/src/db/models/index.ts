// server/src/db/models/index.ts
import User from './User';
import Session from './Session';
import Conversation from './Conversation';
import Message from './Message';
import Plan from './Plan';
import sequelize from '../config';

// Set up additional associations
User.hasMany(Conversation, { foreignKey: 'userId', as: 'conversations' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Conversation.hasMany(Plan, { foreignKey: 'conversationId', as: 'plans' });

export {
  sequelize,
  User,
  Session,
  Conversation,
  Message,
  Plan,
};

export const initModels = async (): Promise<void> => {
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
};