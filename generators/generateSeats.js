const { pgClient } = require("../dbClient");
const { faker } = require("@faker-js/faker");

const wagonTypes = [
  {
    type: "Sleeping",
    setasNumVariants: [40, 44],
    seatTypes: ["Sleeping"],
  },
  {
    type: "Standard",
    setasNumVariants: [50, 60],
    seatTypes: ["Aisle", "Window"],
  },
  {
    type: "Female",
    setasNumVariants: [40, 44],
    seatTypes: ["Sleeping"],
  },
  {
    type: "Lux",
    setasNumVariants: [20, 22],
    seatTypes: ["Aisle", "Window"],
  },
];

async function generateSeatsQuery() {
  const { rows: wagons } = await pgClient.query("SELECT * FROM wagon");
  let sqlQuery = "INSERT INTO seat(number, type, wagon_id) VALUES ";
  for (let wagon of wagons) {
    const wagonSeatsNumVariations = wagonTypes.find(
      (item) => item.type?.trim() === wagon.type?.trim()
    );
    const seatNum =
      wagonSeatsNumVariations.setasNumVariants[
        faker.number.int({ min: 0, max: 1 })
      ];
    for (let i = 1; i <= seatNum; i++) {
      let seatType = "";
      if (wagonSeatsNumVariations.seatTypes.length === 1) {
        seatType = wagonSeatsNumVariations.seatTypes[0];
      } else {
        seatType = wagonSeatsNumVariations.seatTypes[i % 2];
      }
      sqlQuery += `('${i}', '${seatType}', ${wagon.id}),`;
    }
  }
  sqlQuery = sqlQuery.trim().slice(0, -1);
  sqlQuery += ";";
  return sqlQuery;
}

module.exports = {
  generateSeatsQuery,
};
