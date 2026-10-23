const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'padikam_db',
  });

  console.log('Connected to MySQL. Inspecting columns in `users` table...');

  const [cols] = await connection.query(`
    SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
  `, [process.env.DB_NAME || 'padikam_db']);

  const columnNames = cols.map(c => c.COLUMN_NAME);
  console.log('Existing columns:', columnNames);

  // 1. Modify password_hash to allow NULL
  console.log('Modifying password_hash to allow NULL for Google auth users...');
  await connection.query('ALTER TABLE `users` MODIFY `password_hash` VARCHAR(255) NULL;');

  // 2. Add firebase_uid
  if (!columnNames.includes('firebase_uid')) {
    console.log('Adding column: firebase_uid...');
    await connection.query('ALTER TABLE `users` ADD COLUMN `firebase_uid` VARCHAR(128) NULL AFTER `password_hash`;');
  } else {
    console.log('Column firebase_uid already exists.');
  }

  // 3. Add avatar_url
  if (!columnNames.includes('avatar_url')) {
    console.log('Adding column: avatar_url...');
    await connection.query('ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(500) NULL AFTER `firebase_uid`;');
  } else {
    console.log('Column avatar_url already exists.');
  }

  // 4. Add auth_provider
  if (!columnNames.includes('auth_provider')) {
    console.log('Adding column: auth_provider...');
    await connection.query("ALTER TABLE `users` ADD COLUMN `auth_provider` ENUM('local', 'google') NOT NULL DEFAULT 'local' AFTER `avatar_url`;");
  } else {
    console.log('Column auth_provider already exists.');
  }

  console.log('Migration complete. Current users table schema:');
  const [updatedCols] = await connection.query('DESCRIBE `users`;');
  console.table(updatedCols);

  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
