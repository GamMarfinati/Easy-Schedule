exports.up = async function (knex) {
  await knex.schema.createTable("teachers", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("organization_id")
      .references("id")
      .inTable("organizations")
      .onDelete("CASCADE")
      .notNullable();
    table.string("name").notNullable();
    table.string("subject").notNullable(); // Main subject for display (or primary subject)
    table.jsonb("availability").notNullable(); // { "Seg": [0,0,1...], ... }
    table.jsonb("class_assignments").defaultTo("[]"); // Stores classes they teach
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["organization_id"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("teachers");
};
