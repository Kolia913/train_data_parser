require("dotenv").config();

const { pgClient } = require("./dbClient");
const { getStops } = require("./parsers/stationsParser");
const { getSegments } = require("./parsers/trainsRoutesParser");
const { generateFaresQuery } = require("./generators/faresGenerator");

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
  })
  .catch((error) => {
    console.error(error);
  });
