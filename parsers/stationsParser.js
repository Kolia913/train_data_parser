const fs = require("node:fs");
const path = require("node:path");
const Papa = require("papaparse");

const options = {
  header: true,
  delimiter: ",",
};

const parsedStops = [];

function getStops() {
  const promises = [];
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
        const isAllStopsInDb = isAllStopsInDatabase(names.length);
        if (!isAllStopsInDb) {
          for (let name of names) {
            promises.push(
              insertStopToDatabase(findStopByName(parsedStops, name))
            );
          }
        }
        Promise.all(promises)
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
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

async function insertStopToDatabase(payload) {
  if (payload === null) {
    return;
  }
  try {
    await pgClient.query(
      "INSERT INTO station(name, city, lon, lat) VALUES ($1, $2, $3, $4);",
      [payload.name, payload.city, payload.lon, payload.lat]
    );
    console.log("Inserted station: ", payload.name);
  } catch (e) {
    throw e;
  }
}

async function isAllStopsInDatabase(uniqueStatiosCount) {
  try {
    const res = await pgClient.query("SELECT * FROM station");
    return res.rowCount >= uniqueStatiosCount;
  } catch (e) {
    throw e;
  }
}

module.exports = {
  getStops,
};
