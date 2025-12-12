exports.up = async function(knex) {
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('name').notNullable();
    table.string('slug').unique();
    table.string('stripe_customer_id');
    table.string('subscription_status').defaultTo('free'); // free, active, past_due, canceled
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('auth0_id').unique().notNullable();
    table.string('email').notNullable();
    table.string('name');
    table.string('role').defaultTo('member'); // admin, member
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Index for faster tenant lookups
    table.index(['organization_id']);
  });

  await knex.schema.createTable('schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('status').defaultTo('draft'); // draft, published
    table.jsonb('data').notNullable(); // Stores the entire schedule JSON
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['organization_id']);
  });

  await knex.schema.createTable('invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('stripe_invoice_id').unique();
    table.integer('amount_paid');
    table.string('currency');
    table.string('status');
    table.string('pdf_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['organization_id']);
  });

  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('action').notNullable();
    table.jsonb('details');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['organization_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('schedules');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('organizations');
};
