require("dotenv").config();

const { pgClient } = require("./dbClient");
const { getStops } = require("./parsers/stationsParser");
const { getSegments } = require("./parsers/trainsRoutesParser");
const { generateFaresQuery } = require("./generators/faresGenerator");
const { makeUsers } = require("./factories/userFactory");
const { makePassengers } = require("./factories/passengerFactory");

pgClient
  .connect()
  .then(() => {
    getSegments()
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
    // pgClient.query(generateFaresQuery());
    // makeUsers(100);
    // makePassengers();
  })
  .catch((error) => {
    console.error(error);
  });
