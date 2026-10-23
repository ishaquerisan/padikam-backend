import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { databaseModels } from '../models';
import { User, UserRole, UserStatus } from '../models/user.model';
import { UserSettings } from '../models/user-settings.model';
import { Category, CategoryStatus } from '../models/category.model';
import { UserCategory } from '../models/user-category.model';
import { INITIAL_CATEGORIES } from '../../common/constants/app.constants';
import { seedCategorizedSentences } from './seed-sentences';

async function seed() {
  console.log('🌱 Starting Padikam Base Database Seeding...');

  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'padikam_db',
    models: databaseModels,
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  });

  await sequelize.authenticate();
  console.log('✅ Connected to MySQL database');

  await sequelize.sync({ alter: true });
  console.log('✅ Database models synchronized');

  // 1. Seed Categories
  const categoryMap = new Map<string, Category>();
  for (let i = 0; i < INITIAL_CATEGORIES.length; i++) {
    const catData = INITIAL_CATEGORIES[i];
    const [category] = await Category.findOrCreate({
      where: { slug: catData.slug },
      defaults: {
        name: catData.name,
        slug: catData.slug,
        icon: catData.icon,
        description: catData.description,
        sort_order: i + 1,
        status: CategoryStatus.ACTIVE,
      },
    });
    categoryMap.set(catData.slug, category);
  }
  console.log(`✅ Seeded ${categoryMap.size} learning categories`);

  // 2. Seed Users
  // Admin User: admin@padikam.com / Admin@123456
  const adminPass = await bcrypt.hash('Admin@123456', 10);
  const [adminUser] = await User.findOrCreate({
    where: { email: 'admin@padikam.com' },
    defaults: {
      name: 'Padikam Administrator',
      email: 'admin@padikam.com',
      password_hash: adminPass,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await UserSettings.findOrCreate({
    where: { user_id: adminUser.id },
    defaults: {
      user_id: adminUser.id,
      daily_target: 10,
      timezone: 'Asia/Kolkata',
      notifications_enabled: true,
    },
  });

  // Learner User: learner@padikam.com / Learner@123456
  const learnerPass = await bcrypt.hash('Learner@123456', 10);
  const [learnerUser] = await User.findOrCreate({
    where: { email: 'learner@padikam.com' },
    defaults: {
      name: 'Test User',
      email: 'learner@padikam.com',
      password_hash: learnerPass,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  await UserSettings.findOrCreate({
    where: { user_id: learnerUser.id },
    defaults: {
      user_id: learnerUser.id,
      daily_target: 5,
      timezone: 'Asia/Kolkata',
      notifications_enabled: true,
    },
  });

  // Associate default categories for demo learner
  const selectedSlugs = ['friendly-conversations', 'food-and-restaurants', 'travel-and-transportation', 'office'];
  for (const slug of selectedSlugs) {
    const cat = categoryMap.get(slug);
    if (cat) {
      await UserCategory.findOrCreate({
        where: { user_id: learnerUser.id, category_id: cat.id },
        defaults: { user_id: learnerUser.id, category_id: cat.id },
      });
    }
  }

  console.log('✅ Base categories, users, and settings initialized.');

  // 3. Seed Sentences & Quiz data
  await seedCategorizedSentences(sequelize);

  await sequelize.close();
  console.log('✅ Database connection closed.');

  console.log('\n🎉 Complete database initialization successfully finished!');
  console.log('----------------------------------------------------');
  console.log('Admin Account:   admin@padikam.com   / Admin@123456');
  console.log('Learner Account: learner@padikam.com / Learner@123456');
  console.log('----------------------------------------------------');
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}
