'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Sessions', 'twoFactorSecret', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Sessions', 'twoFactorLoggedIn', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Sessions', 'twoFactorSecret');
    await queryInterface.removeColumn('Sessions', 'twoFactorLoggedIn');
  },
};
