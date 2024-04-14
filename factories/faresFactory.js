const { pgClient } = require("../dbClient");

function generateFaresQuery() {
  return `INSERT INTO fare(title, discount) VALUES ('Default', 0), ('Student', 40), ('Child', 50), ('Pension', 30);`;
}

async function makeFares() {
  console.log("Inserting fares...");
  const { rows: faresFromDb } = await pgClient.query("SELECT * FROM fare;");
  if (faresFromDb.length) {
    return;
  }
  const res = await pgClient.query(generateFaresQuery());
  console.log("Inserted fares: ", res.rowCount);
}

module.exports = {
  makeFares,
};
