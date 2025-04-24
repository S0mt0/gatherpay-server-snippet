'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'socialId', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'email_verified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await queryInterface.renameColumn(
      'users',
      'verified_phone',
      'phone_verified',
    );

    await queryInterface.renameColumn('users', 'verified_kyc', 'kyc_verified');

    await queryInterface.renameColumn('users', 'auth_method', 'provider');

    await queryInterface.changeColumn('users', 'firstName', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('users', 'country', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('users', 'lastName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'socialId');
    await queryInterface.removeColumn('users', 'email_verified');

    await queryInterface.renameColumn(
      'users',
      'phone_verified',
      'verified_phone',
    );

    await queryInterface.renameColumn('users', 'kyc_verified', 'verified_kyc');

    await queryInterface.renameColumn('users', 'provider', 'auth_method');

    await queryInterface.changeColumn('users', 'firstName', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn('users', 'country', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn('users', 'lastName', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
