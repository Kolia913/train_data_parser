const fs = require("node:fs");
const path = require("node:path");
const Papa = require("papaparse");
const { pgClient } = require("../dbClient");
const { generateWagonsQuery } = require("../generators/generateWagons");
const { generateSeatsQuery } = require("../generators/generateSeats");
const {
  generateAdditionalServiceQuery,
  genereateWagonsServicesQuery,
} = require("../generators/generateAdditionalServices");

const EARTH_RADIUS_IN_KM = 6371;

const options = {
  header: true,
  delimiter: ";",
};

const parsedRoutes = [];
const parsedSegments = [];
const parsedTrains = [];
const generatedWagons = [];

function getSegments() {
  fs.createReadStream(
    path.join(__dirname, "/../", "/data/", "/Belgium_Lines_SNCB.csv")
  )
    .pipe(Papa.parse(Papa.NODE_STREAM_INPUT, options))
    .on("data", (data) => {
      parsedTrains.push({
        type: getTrainType(data.short_name),
        number: data[Object.keys(data)[0]],
        class: data.short_name.charAt(0),
      });
      parsedSegments.push([JSON.parse(data.shape).coordinates[0]]);
    })
    .on("end", async () => {
      // await insertSegments();
      // await insertTrains();
      // await insertWagons();
      // await insertSeats();
      // await insertAdditionalServices();
      // await insertWagonsAdditionalServices();
    });
}

async function insertSegments() {
  const { rows: stations } = await pgClient.query("SELECT * FROM station");
  const { rows: segmentsFromDb } = await pgClient.query(
    "SELECT * FROM segment"
  );
  let mappedSegments = [];
  for (let segments of parsedSegments) {
    for (let i = 0; i < segments.length; i++) {
      for (let j = 0; j < segments[i].length; j++) {
        if (segments[i][j + 1]) {
          const departure_station = stations.find(
            (stationItem) =>
              stationItem.lon === segments[i][j][0] &&
              stationItem.lat === segments[i][j][1]
          );
          const arrival_station = stations.find(
            (stationItem) =>
              stationItem.lon === segments[i][j + 1][0] &&
              stationItem.lat === segments[i][j + 1][1]
          );
          if (arrival_station && departure_station) {
            const distance =
              Math.acos(
                Math.sin(departure_station.lat) *
                  Math.sin(arrival_station.lat) +
                  Math.cos(departure_station.lat) *
                    Math.cos(arrival_station.lat) *
                    Math.cos(arrival_station.lon - departure_station.lon)
              ) * EARTH_RADIUS_IN_KM;
            mappedSegments.push([
              departure_station?.id,
              arrival_station?.id,
              Number(distance.toFixed(2)),
            ]);
          }
        }
      }
    }
  }
  const uniqueSegments = [];
  for (let item of mappedSegments) {
    const isInUniqueArray = uniqueSegments.find((searchItem) => {
      return item[0] === searchItem[0] && item[1] === searchItem[1];
    });
    if (!isInUniqueArray) {
      uniqueSegments.push(item);
    }
  }
  if (uniqueSegments.length && !segmentsFromDb.length) {
    let sqlQuery =
      "INSERT INTO segment(distance, d_station_id, a_station_id) VALUES ";
    for (let uniqueSegment of uniqueSegments) {
      sqlQuery += `(${uniqueSegment[2]}, ${uniqueSegment[0]}, ${uniqueSegment[1]}),`;
    }
    sqlQuery = sqlQuery.trim().slice(0, -1);
    sqlQuery += ";";
    console.log(sqlQuery);
    const res = await pgClient.query(sqlQuery);
    console.log("res - ", res);
  }
}

async function insertTrains() {
  const { rows: trainsFromDb } = await pgClient.query("SELECT * FROM train");
  console.log(trainsFromDb, parsedTrains);
  if (!trainsFromDb.length && parsedTrains.length) {
    let sqlQuery = "INSERT INTO train(number, type, class) VALUES ";
    for (let train of parsedTrains) {
      sqlQuery += `('${train.number}', '${train.type}', '${train.class}'),`;
    }
    sqlQuery = sqlQuery.trim().slice(0, -1);
    sqlQuery += ";";
    const res = await pgClient.query(sqlQuery);
    console.log("res - ", res);
  }
}

async function insertWagons() {
  const wagonsQuery = await generateWagonsQuery();
  const res = await pgClient.query(wagonsQuery);
  console.log("res - ", res);
}

async function insertSeats() {
  const seatsQuery = await generateSeatsQuery();
  console.log(seatsQuery);
  const res = await pgClient.query(seatsQuery);
  console.log("res - ", res);
}

async function insertAdditionalServices() {
  const servicesQuery = generateAdditionalServiceQuery();
  console.log(servicesQuery);
  const res = await pgClient.query(servicesQuery);
  console.log("res - ", res);
}

async function insertWagonsAdditionalServices() {
  const servicesQuery = await genereateWagonsServicesQuery();
  console.log(servicesQuery);
  const res = await pgClient.query(servicesQuery);
  console.log("res - ", res);
}

function getTrainType(shortName) {
  if (shortName === "IC") {
    return "Intercity";
  } else if (shortName === "P") {
    return "Peak";
  } else if (shortName.startsWith("S")) {
    return "Suburban";
  } else if (shortName === "EXP") {
    return "Express";
  } else {
    return "Regular";
  }
}

module.exports = {
  getSegments,
};
