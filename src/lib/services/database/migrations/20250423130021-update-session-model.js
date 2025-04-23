'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sessions', 'twoFactorSecret', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('sessions', 'twoFactorLoggedIn', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sessions', 'twoFactorSecret');
    await queryInterface.removeColumn('sessions', 'twoFactorLoggedIn');
  },
};
