const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'padikam_db',
  });

  console.log('Connected to MySQL DB.');

  // 1. Add difficulty_level to users table
  const [uCols] = await conn.query("SHOW COLUMNS FROM users LIKE 'difficulty_level'");
  if (uCols.length === 0) {
    await conn.query(
      "ALTER TABLE users ADD COLUMN difficulty_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL DEFAULT 'BEGINNER' AFTER role"
    );
    console.log('SUCCESS: Added difficulty_level to users table');
  } else {
    console.log('users table already has difficulty_level');
  }

  // 2. Add difficulty_level to user_settings table
  const [sCols] = await conn.query("SHOW COLUMNS FROM user_settings LIKE 'difficulty_level'");
  if (sCols.length === 0) {
    await conn.query(
      "ALTER TABLE user_settings ADD COLUMN difficulty_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL DEFAULT 'BEGINNER' AFTER daily_target"
    );
    console.log('SUCCESS: Added difficulty_level to user_settings table');
  } else {
    console.log('user_settings table already has difficulty_level');
  }

  const [uFinal] = await conn.query('SHOW COLUMNS FROM users');
  console.log('Final users columns:', uFinal.map((c) => c.Field));

  const [sFinal] = await conn.query('SHOW COLUMNS FROM user_settings');
  console.log('Final user_settings columns:', sFinal.map((c) => c.Field));

  await conn.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
