// server/src/db/models/Plan.ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config';
import Conversation from './Conversation';

interface PlanStep {
  id: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

interface PlanAttributes {
  id: string;
  conversationId: string;
  title: string;
  description?: string;
  steps: PlanStep[];
  currentStepIndex: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlanCreationAttributes extends Optional<PlanAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Plan extends Model<PlanAttributes, PlanCreationAttributes> implements PlanAttributes {
  public id!: string;
  public conversationId!: string;
  public title!: string;
  public description?: string;
  public steps!: PlanStep[];
  public currentStepIndex!: number;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Plan.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    steps: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    currentStepIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'plans',
  }
);

// Define associations
Plan.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
});

export default Plan;