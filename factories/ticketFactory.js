const { pgClient } = require("../dbClient");
const { faker, fa } = require("@faker-js/faker");
const dayjs = require("dayjs");

async function makeTickets(ticketsPerPassenger) {
  console.log("Inserting tickets with services and routes...");

  const { rows: ticketsFromDb } = await pgClient.query("SELECT * FROM ticket;");

  if (ticketsFromDb.length) {
    return;
  }

  const { rows: wagonRoutes } = await pgClient.query(
    `SELECT s.id as seat_id, rp.wagon_id, json_agg(json_build_object('id', rp.id, 'price', rp.price, 'order', rp."order"))
    as route_parts FROM seat s JOIN wagon w ON s.wagon_id = w.id JOIN route_part rp ON rp.wagon_id = w.id GROUP BY s.id, rp.wagon_id;`
  );

  const { rows: passengers } = await pgClient.query(
    "SELECT p.id, f.discount, f.id as fare_id FROM passenger p JOIN fare f ON p.fare_id = f.id;"
  );

  const seatsWagonsRoutes = [...wagonRoutes];
  const futureTicketsRoutes = [];
  let ticketSqlQuery =
    "INSERT INTO ticket(price, price_with_discount, purchase_timestamp, usage_timestamp, passenger_id, seat_id, fare_id) VALUES ";
  const boughtWagonsSeats = [];
  for (let passenger of passengers) {
    for (let i = 0; i < ticketsPerPassenger; i++) {
      const filteredSeatsWagonsRotes = seatsWagonsRoutes.filter(
        (item) => !boughtWagonsSeats.includes([item.seat_id, item.wagon_id])
      );
      const randomWagon =
        filteredSeatsWagonsRotes[
          faker.number.int({ min: 0, max: wagonRoutes.length - 1 })
        ];
      const routePartsLength = randomWagon.route_parts?.length;
      boughtWagonsSeats.push([randomWagon.seat_id, randomWagon.wagon_id]);

      const minRouteIndex = faker.number.int({
        min: 0,
        max: routePartsLength <= 1 ? routePartsLength : routePartsLength - 1,
      });
      const maxRouteIndex =
        minRouteIndex +
        faker.number.int({
          min: minRouteIndex,
          max: routePartsLength <= 1 ? routePartsLength : routePartsLength - 1,
        });
      const ticketRouteParts = randomWagon.route_parts.slice(
        minRouteIndex,
        maxRouteIndex
      );

      const ticketPrice = ticketRouteParts.reduce(
        (acc, val) => (acc += +val.price),
        0
      );

      const priceWithDiscount =
        ticketPrice - ticketPrice * (passenger.discount / 100);

      futureTicketsRoutes.push({
        seat_to_identify_ticket: randomWagon.seat_id,
        route_parts: ticketRouteParts,
      });

      ticketSqlQuery += `(${ticketPrice}, ${priceWithDiscount}, '${dayjs()
        .add(i, "month")
        .add(faker.number.int({ min: 1, max: 7 }), "day")
        .add(faker.number.int({ min: 0, max: 1440 }), "minute")
        .format("YYYY-MM-DD HH:mm:ss")}'::TIMESTAMP, '${dayjs()
        .add(i, "month")
        .add(faker.number.int({ min: 8, max: 31 }), "day")
        .add(faker.number.int({ min: 0, max: 1440 }), "minute")
        .format("YYYY-MM-DD HH:mm:ss")})'::TIMESTAMP, ${passenger.id}, ${
        randomWagon.seat_id
      }, ${passenger.fare_id}),`;
    }
  }
  ticketSqlQuery = ticketSqlQuery.trim().slice(0, -1);
  ticketSqlQuery += ";";
  const res = await pgClient.query(ticketSqlQuery);
  console.log("Inserted tickets: ", res.rowCount);

  const { rows: insertedTickets } = await pgClient.query(
    "SELECT * FROM ticket;"
  );

  let ticketRoutesSqlQuery =
    "INSERT INTO ticket_route(ticket_id, route_part_id) VALUES ";
  for (let seatWithRoute of futureTicketsRoutes) {
    const foundTicket = insertedTickets.find(
      (item) => item.seat_id === seatWithRoute.seat_to_identify_ticket
    );
    for (let route_p of seatWithRoute.route_parts) {
      ticketRoutesSqlQuery += `(${foundTicket.id}, ${route_p.id}),`;
    }
  }
  ticketRoutesSqlQuery = ticketRoutesSqlQuery.trim().slice(0, -1);
  ticketRoutesSqlQuery += ";";
  const resTR = await pgClient.query(ticketRoutesSqlQuery);
  console.log("Inserted tickets routes: ", resTR.rowCount);
}

async function makeTicketServices() {
  console.log("Inserting tickets services...");
  const { rows: ticketsWithServies } =
    await pgClient.query(`SELECT t.id, t.usage_timestamp::VARCHAR, t.fare_id, (array_agg(json_build_object('id', a_s.id, 'price', a_s.price)))[1]
    as available_service
FROM ticket t JOIN seat s ON s.id = t.seat_id
    JOIN wagon w ON s.wagon_id = w.id
    JOIN wagons_services ws ON ws.wagon_id = w.id
    JOIN additional_service a_s ON ws.additional_service_id = a_s.id
GROUP BY t.id ;
;`);

  const { rows } = await pgClient.query("SELECT * FROM tickets_services;");
  if (rows.length) {
    return;
  }

  let ticketsServicesSqlQuery =
    "INSERT INTO tickets_services(ticket_id, additional_service_id, price_with_discount, sale_timestamp) VALUES ";
  const { rows: fares } = await pgClient.query("SELECT * FROM fare;");
  for (let ticketWishService of ticketsWithServies) {
    const fare = fares.find((item) => item.id === ticketWishService.fare_id);
    ticketsServicesSqlQuery += `(${ticketWishService.id}, ${
      ticketWishService.available_service.id
    }, ${
      ticketWishService.available_service.price -
      ticketWishService.available_service.price * (fare.discount / 100)
    }, '${ticketWishService.usage_timestamp}'::TIMESTAMP),`;
  }
  ticketsServicesSqlQuery = ticketsServicesSqlQuery.trim().slice(0, -1);
  ticketsServicesSqlQuery += ";";
  const res = await pgClient.query(ticketsServicesSqlQuery);
  console.log("Inserted tickets services:", res.rowCount);
}

module.exports = {
  makeTickets,
  makeTicketServices,
};
