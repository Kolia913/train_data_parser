require("dotenv").config();

const { pgClient } = require("./dbClient");
const { getStops } = require("./parsers/stationsParser");
const { getSegments } = require("./parsers/trainsRoutesParser");
const { makeFares } = require("./factories/faresFactory");
const { makeUsers } = require("./factories/userFactory");
const { makePassengers } = require("./factories/passengerFactory");
const {
  makeTickets,
  makeTicketServices,
} = require("./factories/ticketFactory");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const PORT = 3033;

app.post("/fill-oltp", async (req, res) => {
  const body = req.body;
  const usersCount = body?.users ? body.users : 100;
  const ticketsPerUser = body?.tickets_per_user ? body.tickets_per_user : 10;
  try {
    await getStops();
    await getSegments();
    await makeFares();
    await makeUsers(+usersCount);
    await makePassengers();
    await makeTickets(+ticketsPerUser);
    await makeTicketServices();
    res.status(201).send("Data successfully uploaded!");
  } catch (e) {
    res.status(500).send("Internal server error");
  }
});

const server = app.listen(PORT, async () => {
  try {
    await pgClient.connect();
    console.log(`Server is running on port ${PORT}`);
  } catch (e) {
    console.log(e);
    server.close();
  }
});

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);
process.on("exit", shutDown);

function shutDown() {
  console.log("Received kill signal, shutting down gracefully");

  server.close(() => {
    console.log("Closed out remaining connections");
    process.exit(0);
  });

  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
}
