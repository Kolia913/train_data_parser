require("dotenv").config();

const { pgClient } = require("./dbClient");
const { getStops } = require("./parsers/stationsParser");
const { getSegments } = require("./parsers/trainsRoutesParser");
const { makeFares } = require("./factories/faresFactory");
const { makeUsers } = require("./factories/userFactory");
const { makePassengers } = require("./factories/passengerFactory");
const { makeTickets } = require("./factories/ticketFactory");

pgClient
  .connect()
  .then(async () => {
    try {
      await getStops();
      await getSegments();
      await makeFares();
      await makeUsers(100);
      await makePassengers();
      await makeTickets();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(error);
  });
