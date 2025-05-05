/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const groupToOwnerMap = {
      '06c884c5-f23f-405c-bb7b-159ab38b302b':
        'aa1ee486-7b44-4604-bdc6-69ad680a2dbd',
      '151bdc49-4af0-405b-ab77-ff3d7fd2e4e7':
        '9948d2d6-0fa5-402e-a281-66275be44f3a',
      '3bcaaad0-bc2a-40ab-b01c-e42776b4d72c':
        '3cd4a2cd-6c05-4ae1-ab42-ef3c5c37deac',
      '4aa05059-88ed-479a-864c-b4e7f759bb3c':
        '01a50a31-81d5-4eae-84e6-4a44daec263e',
      '53ae2f7b-39b9-4f53-ac84-99bbde6bfe71':
        '01a50a31-81d5-4eae-84e6-4a44daec263e',
      '71b500b7-d890-456a-8b6b-fb99f76f8e2f':
        '9948d2d6-0fa5-402e-a281-66275be44f3a',
      '746bc6bd-033f-439a-b589-56283ecaaf06':
        '1ba3c29a-d721-457e-906c-e39164eef4ff',
      '7486b636-d0da-40d3-a82c-9e9f53957ec0':
        'aa1ee486-7b44-4604-bdc6-69ad680a2dbd',
      '80d65512-00cd-4aa8-bb2d-881e2897fb12':
        'a876ab28-83c1-4bd5-bee9-c2d2cf1a07b8',
      '9bc4ae9f-3fcf-410e-b276-b5a2b2eccb44':
        '9948d2d6-0fa5-402e-a281-66275be44f3a',
      '9d263a50-4bd4-4fc9-968f-16b3a9bdba33':
        '3cd4a2cd-6c05-4ae1-ab42-ef3c5c37deac',
      'b4e7ed9b-79c1-409c-b17e-ad54909bcd0c':
        'a876ab28-83c1-4bd5-bee9-c2d2cf1a07b8',
      'c957e632-0a48-4ac0-92f3-fa9b89c926ae':
        '1ba3c29a-d721-457e-906c-e39164eef4ff',
      'd3b50709-5724-492d-bd55-e936b7a5b2db':
        '1ba3c29a-d721-457e-906c-e39164eef4ff',
      'dfdf1977-3a30-479e-8a2e-c1454464946e':
        '01a50a31-81d5-4eae-84e6-4a44daec263e',
    };

    const userIds = [
      '01a50a31-81d5-4eae-84e6-4a44daec263e',
      '1ba3c29a-d721-457e-906c-e39164eef4ff',
      '3cd4a2cd-6c05-4ae1-ab42-ef3c5c37deac',
      '71bbe751-5f15-48ce-b3b2-70623c3c0c6c',
      '9948d2d6-0fa5-402e-a281-66275be44f3a',
      'a876ab28-83c1-4bd5-bee9-c2d2cf1a07b8',
      'aa1ee486-7b44-4604-bdc6-69ad680a2dbd',
      'b488b451-e6b0-4e38-9bb3-b7788ee9f26e',
      'e8689dbf-6d9a-45b3-9c3d-34f641e9117b',
      'e86ca37c-e203-4ac4-a3f0-c4dac7b9c845',
    ];

    const memberships = [];

    // Add admin (owner) memberships
    Object.entries(groupToOwnerMap).forEach(([groupId, ownerId]) => {
      memberships.push({
        id: uuidv4(),
        status: 'active',
        role: 'admin',
        memberId: ownerId,
        groupId,
        memberSince: now,
        payoutOrder: 1,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Add random members
    const getRandomInt = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    for (const [groupId, ownerId] of Object.entries(groupToOwnerMap)) {
      const eligibleMembers = userIds.filter((id) => id !== ownerId);
      const numberOfMembers = getRandomInt(3, 6);
      const shuffled = eligibleMembers.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numberOfMembers);

      selected.forEach((memberId, idx) => {
        memberships.push({
          id: uuidv4(),
          status: Math.random() > 0.2 ? 'active' : 'pending',
          role: 'member',
          memberId,
          groupId,
          memberSince: now,
          payoutOrder: idx + 2, // admin is 1
          createdAt: now,
          updatedAt: now,
        });
      });
    }

    await queryInterface.bulkInsert('user_group_memberships', memberships, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('user_group_memberships', null, {});
  },
};
