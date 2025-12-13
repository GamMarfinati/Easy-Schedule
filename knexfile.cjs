require('dotenv').config();

// Debug: verificar se DATABASE_URL está disponível
console.log('[DB Config] DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[DB Config] DATABASE_URL host:', process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'NOT SET');

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: "./migrations",
      extension: "cjs"
    }
  },
  production: {
    client: "postgresql",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations"
    }
  }
};
