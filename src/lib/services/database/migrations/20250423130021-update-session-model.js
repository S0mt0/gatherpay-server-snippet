('use strict');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SESSIONS_TABLE } = require('../../../../users/auth/models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(SESSIONS_TABLE, 'twoFactorSecret', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn(SESSIONS_TABLE, 'twoFactorLoggedIn', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(SESSIONS_TABLE, 'twoFactorSecret');
    await queryInterface.removeColumn(SESSIONS_TABLE, 'twoFactorLoggedIn');
  },
};
