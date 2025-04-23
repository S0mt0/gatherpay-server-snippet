// Note To Devs: To use this migrations configuration, spin up the database service using docker with the same exact setup provided on the docker-compose.yml file. Hint: you only have to ensure that the docker engine is running, then use the scripts provided in the package.json file to run your containers.
module.exports = {
  development: {
    url:
      process.env.DATABASE_URL ||
      'postgres://sewkito:123@127.0.0.1:5434/gatherpay',
    dialect: 'postgres',
    dialectOptions: {
      bigNumberStrings: true,
    },
  },

  test: {
    url: 'postgres://sewkito:123@127.0.0.1:5435/gatherpay',
    dialect: 'postgres',
    dialectOptions: {
      bigNumberStrings: true,
    },
  },

  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      bigNumberStrings: true,
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 10,
      min: 1,
      acquire: 30000,
      idle: 10000,
    },

    timezone: 'UTC',
  },
};
