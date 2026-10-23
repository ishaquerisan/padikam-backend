import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { databaseModels } from '../database/models';

export const getDatabaseConfig = (): SequelizeModuleOptions => ({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'padikam_db',
  models: databaseModels,
  autoLoadModels: true,
  synchronize: true, // creates/syncs tables in dev mode safely
  logging: process.env.NODE_ENV === 'production' ? false : (sql) => {
    // Keep dev logs clean without flood
    if (sql.includes('SELECT 1+1') || sql.includes('SHOW TABLES')) return;
  },
  define: {
    timestamps: true,
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  timezone: '+05:30', // Default IST
});
