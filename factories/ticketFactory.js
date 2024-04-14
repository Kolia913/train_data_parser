const { pgClient } = require("../dbClient");
const { faker } = require("@faker-js/faker");
const dayjs = require("dayjs");

async function makeTickets(ticketsPerPassenger) {
  const { rows: wagonRoutes } = await pgClient.query(
    `SELECT rp.wagon_id, json_agg(json_build_object('id', rp.id, 'price', rp.price, 'order', rp."order"))
     as route_parts FROM route_part rp GROUP BY wagon_id;`
  );

  const { rows: passengers } = await pgClient.query(
    "SELECT p.id, f.discount FROM passenger p JOIN fare f ON p.fare_id = f.id;"
  );
}

module.exports = {
  makeTickets,
};
