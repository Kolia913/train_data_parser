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
const dayjs = require("dayjs");
const duration = require("dayjs/plugin/duration");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(customParseFormat);
dayjs.extend(duration);

const EARTH_RADIUS_IN_KM = 6371;

const trainAvgSpeedByType = {
  Regular: 90,
  Suburban: 80,
  Peak: 110,
  Intercity: 120,
};

const trainAvgStopTimeByType = {
  Regular: 10,
  Suburban: 8,
  Peak: 5,
  Intercity: 2,
};

const wagonPricePerKilometerByType = {
  Female: 0.06,
  Lux: 0.3,
  Sleeping: 0.055,
  Standard: 0.04,
};

const options = {
  header: true,
  delimiter: ";",
};

const parsedSegments = [];
const parsedTrains = [];
const routeNamesWithSegments = [];

async function getSegments() {
  return new Promise((resolve, reject) => {
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
        routeNamesWithSegments.push({
          name: data.long_name,
          number: data[Object.keys(data)[0]],
          segments: JSON.parse(data.shape).coordinates[0],
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("end", async () => {
        // await insertSegments();
        // await insertTrains();
        // await insertWagons();
        // await insertSeats();
        // await insertAdditionalServices();
        // await insertWagonsAdditionalServices();
        await insertRouteParts(routeNamesWithSegments);
        resolve();
      });
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

async function insertRouteParts(routeNamesWithSegments) {
  const { rows: wagons } =
    await pgClient.query(`SELECT w.id, w.number, w.type, t.number as train_number,
                          t.type as train_type, t.class as train_class
                          FROM wagon w JOIN train t ON w.train_id = t.id;`);
  const { rows: segments } =
    await pgClient.query(`SELECT s.id, s.distance, depart_st.id as dep_st_id,
                          depart_st.lon as dep_st_lon, 
                          depart_st.lat as dep_st_lat,
                          arriv_st.id as arr_st_id, 
                          arriv_st.lon as arr_st_lon, 
                          arriv_st.lat as arr_st_lat 
                          FROM segment s
                          JOIN station depart_st 
                          ON s.d_station_id = depart_st.id
                          JOIN station arriv_st 
                          ON s.a_station_id = arriv_st.id;`);
  const stopsTimesData = await readStopsTimesData();
  const routePartsData = [];
  for (let wagon of wagons) {
    const routeNameWithSegments = routeNamesWithSegments.find(
      (item) => item.number === wagon.train_number
    );
    const stopTimesData = stopsTimesData.find(
      (item) => item.name === routeNameWithSegments.name
    );
    for (let i = 0; i < routeNameWithSegments.segments.length - 1; i++) {
      if (routeNameWithSegments.segments[i + 1]) {
        const foundSegment = segments.find(
          (item) =>
            routeNameWithSegments.segments[i][0] === item.dep_st_lon &&
            routeNameWithSegments.segments[i][1] === item.dep_st_lat &&
            routeNameWithSegments.segments[i + 1][0] === item.arr_st_lon &&
            routeNameWithSegments.segments[i + 1][1] === item.arr_st_lat
        );
        if (foundSegment && stopTimesData) {
          let currentStopData = {};
          if (i === 0) {
            currentStopData = {
              arrival_time: stopTimesData.arrival_time,
              departure_time:
                stopTimesData.departure_time +
                trainAvgStopTimeByType[wagon.train_type],
              order: stopTimesData.order,
            };
          } else {
            const prevSegment = segments.find(
              (item) =>
                routeNameWithSegments.segments[i - 1][0] === item.dep_st_lon &&
                routeNameWithSegments.segments[i - 1][1] === item.dep_st_lat &&
                routeNameWithSegments.segments[i][0] === item.arr_st_lon &&
                routeNameWithSegments.segments[i][1] === item.arr_st_lat
            );
            const timeDelta =
              (prevSegment.distance / trainAvgSpeedByType[wagon.train_type]) *
              60;
            const arr_time = +(
              routePartsData.find((item) => item.segment_id === prevSegment.id)
                .departure_time + timeDelta
            ).toFixed();
            const dep_time = +(
              routePartsData.find((item) => item.segment_id === prevSegment.id)
                .departure_time +
              timeDelta +
              trainAvgStopTimeByType[wagon.train_type]
            ).toFixed();
            currentStopData = {
              // arrival_time:
              //   arr_time > 24 * 60 ? Math.abs(24 * 60 - arr_time) : arr_time,
              arrival_time: arr_time,
              departure_time: dep_time,
              // departure_time:
              //   dep_time > 24 * 60 ? Math.abs(24 * 60 - dep_time) : dep_time,
              order: stopTimesData.order + i,
            };
          }

          routePartsData.push({
            wagon_id: wagon.id,
            segment_id: foundSegment.id,
            distance: foundSegment.distance,
            price: +(
              foundSegment.distance * wagonPricePerKilometerByType[wagon.type]
            ).toFixed(2),
            ...currentStopData,
          });
        } else {
          continue;
        }
      }
    }
  }
  for (let routePart of routePartsData) {
    //#TODO: insert to database
  }
}

async function readStopsTimesData() {
  const routeTrips = await getRouteTrips();
  return new Promise((resolve, reject) => {
    const parsedStopTimes = [];
    fs.createReadStream(
      path.join(__dirname, "/../", "/data/", "/stop_times.csv")
    )
      .pipe(
        Papa.parse(Papa.NODE_STREAM_INPUT, {
          header: true,
          delimiter: ",",
        })
      )
      .on("data", (chunk) => {
        const routeAndTrip = routeTrips.find(
          (item) => item.trip_id === chunk.trip_id
        );
        if (routeAndTrip) {
          const referenceTime = dayjs("00:00:00", "HH:mm:ss").date(1).month(0);
          parsedStopTimes.push({
            ...routeAndTrip,
            arrival_time: dayjs
              .duration(
                dayjs(chunk.arrival_time, "HH:mm:ss")
                  .date(1)
                  .month(0)
                  .diff(referenceTime)
              )
              .asMinutes(),
            departure_time: dayjs
              .duration(
                dayjs(chunk.departure_time, "HH:mm:ss")
                  .date(1)
                  .month(0)
                  .diff(referenceTime)
              )
              .asMinutes(),
            // times: [chunk.arrival_time, chunk.departure_time],
            order: +chunk.stop_sequence,
          });
        }
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("end", () => {
        resolve(parsedStopTimes);
      });
  });
}

async function getRouteTrips() {
  const routes = await readRoutesData();
  const trips = await readTripsData();

  return routes.map((item) => {
    return {
      route_id: item.id,
      name: item.name,
      trip_id: trips.find((trip) => +trip.route_id === +item.id)?.trip_id,
    };
  });
}

async function readRoutesData() {
  return new Promise((resolve, reject) => {
    const parsedRoutes = [];
    fs.createReadStream(path.join(__dirname, "/../", "/data/", "/routes.csv"))
      .pipe(
        Papa.parse(Papa.NODE_STREAM_INPUT, {
          header: true,
          delimiter: ",",
        })
      )
      .on("data", (chunk) => {
        parsedRoutes.push({
          id: +chunk.route_id,
          name: chunk.route_long_name,
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("end", () => {
        resolve(parsedRoutes);
      });
  });
}

async function readTripsData() {
  return new Promise((resolve, reject) => {
    const parsedTrips = [];
    fs.createReadStream(path.join(__dirname, "/../", "/data/", "/trips.csv"))
      .pipe(
        Papa.parse(Papa.NODE_STREAM_INPUT, {
          header: true,
          delimiter: ",",
        })
      )
      .on("data", (chunk) => {
        const existingTripForRoute = parsedTrips.find(
          (item) => +item.route_id === +chunk.route_id
        );
        if (!existingTripForRoute) {
          parsedTrips.push({
            trip_id: chunk.trip_id,
            route_id: +chunk.route_id,
          });
        }
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("end", () => {
        resolve(parsedTrips);
      });
  });
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
