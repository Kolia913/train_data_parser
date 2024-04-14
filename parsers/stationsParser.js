const fs = require("node:fs");
const path = require("node:path");
const Papa = require("papaparse");
const { pgClient } = require("../dbClient");

const options = {
  header: true,
  delimiter: ",",
};

const parsedStops = [];

function getStops() {
  console.log("Inserting stops...");
  return new Promise((resolve, reject) => {
    fs.createReadStream(
      path.join(path.join(__dirname, "/../", "/data/", "/stops.csv"))
    )
      .pipe(Papa.parse(Papa.NODE_STREAM_INPUT, options))
      .on("data", (data) => {
        parsedStops.push(data);
      })
      .on("error", (err) => {
        console.error(err);
        reject(err);
      })
      .on("end", async () => {
        const names = getDistinctStopNames(parsedStops);
        const isStopsInDb = await isStopsInDatabase();
        let sqlQuery = "INSERT INTO station(name, city, lon, lat) VALUES ";
        if (!isStopsInDb) {
          for (let name of names) {
            const stopData = findStopByName(parsedStops, name);
            sqlQuery += `('${stopData.name.replaceAll("'", " ")}', '${
              stopData.city
            }', ${stopData.lon}, ${stopData.lat}),`;
          }
          sqlQuery = sqlQuery.trim().slice(0, -1);
          sqlQuery += ";";
          const res = await pgClient.query(sqlQuery);
          console.log("Inserted stops:  ", res.rowCount);
        }
        resolve();
      });
  });
}

function getDistinctStopNames(stopsData) {
  const stopNames = stopsData.map((item) => item.stop_name);
  return [...new Set(stopNames)];
}

function findStopByName(stopsData, stopName) {
  const stop = stopsData.find((item) => item.stop_name === stopName);
  if (stop) {
    return {
      name: stop.stop_name,
      city: "",
      lat: stop.stop_lat,
      lon: stop.stop_lon,
    };
  } else {
    return null;
  }
}

async function isStopsInDatabase() {
  try {
    const res = await pgClient.query("SELECT * FROM station");
    return res.rowCount;
  } catch (e) {
    throw e;
  }
}

module.exports = {
  getStops,
};
