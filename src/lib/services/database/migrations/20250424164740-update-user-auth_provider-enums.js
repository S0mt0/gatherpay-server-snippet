'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remove the default temporarily
    await queryInterface.sequelize.query(`
      ALTER TABLE "users" ALTER COLUMN "provider" DROP DEFAULT;
    `);

    // 2. Change type to ENUM
    await queryInterface.changeColumn('users', 'provider', {
      type: Sequelize.ENUM(
        'credentials',
        'google.com',
        'facebook.com',
        'apple.com',
      ),
    });

    // 3. Set the default again
    await queryInterface.sequelize.query(`
      ALTER TABLE "users" ALTER COLUMN "provider" SET DEFAULT 'credentials';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert to STRING
    await queryInterface.changeColumn('users', 'provider', {
      type: Sequelize.STRING,
    });

    // Drop the ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_users_provider";
    `);
  },
};
