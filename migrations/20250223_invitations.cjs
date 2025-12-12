exports.up = async function(knex) {
  await knex.schema.createTable('invitations', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('email').notNullable();
    table.string('token').unique().notNullable();
    table.string('role').defaultTo('member');
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.timestamp('expires_at').notNullable();
    table.string('created_by'); // Auth0 ID of inviter
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['organization_id']);
    table.index(['token']);
  });
}

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('invitations');
}
