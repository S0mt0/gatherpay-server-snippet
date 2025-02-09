/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';
const { v4: uuidv4 } = require('uuid');
const argon2 = require('argon2');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    const hashedPassword = await argon2.hash('password123');

    return queryInterface.bulkInsert('Users', [
      {
        id: uuidv4(),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        terms_of_service: true,
        joinedAt: new Date(),
      },
      {
        id: uuidv4(),
        firstName: 'Uche',
        lastName: 'Emma',
        email: 'uche.emma@example.com',
        password: hashedPassword,
        terms_of_service: true,
        joinedAt: new Date(),
      },
      {
        id: uuidv4(),
        firstName: 'Cruz',
        lastName: 'Boy',
        email: 'cruz.boy@example.com',
        password: hashedPassword,
        terms_of_service: true,
        joinedAt: new Date(),
      },
    ]);
  },
  down: (queryInterface) => {
    return queryInterface.bulkDelete('Users', null, {});
  },
};
