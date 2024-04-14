const { pgClient } = require("../dbClient");
const { faker } = require("@faker-js/faker");
const dayjs = require("dayjs");

async function makePassengers() {
  console.log("Inserting passengers...");
  const { rows: passengersFromDb } = await pgClient.query(
    "SELECT * FROM passenger;"
  );
  if (passengersFromDb.length) {
    return;
  }
  const { rows: users } = await pgClient.query(`SELECT * FROM "user";`);
  const { rows: fares } = await pgClient.query("SELECT * FROM fare;");
  let sqlQuery =
    "INSERT INTO passenger(first_name, last_name, birth_date, fare_id, user_id) VALUES ";
  for (let user of users) {
    const first_name = faker.person.firstName();
    const last_name = faker.person.lastName();
    const birth_date = faker.date.birthdate({ min: 14, max: 70, mode: "age" });
    const user_id = user.id;
    let fare = null;
    const age = dayjs().diff(birth_date, "years");
    const formattedBirthDate = dayjs(birth_date).format("YYYY-MM-DD");
    if (age < 18) {
      fare = fares.find((item) => item.title === "Child");
    } else if (age >= 18 && age <= 24) {
      fare = fares.find((item) => item.title === "Student");
    } else if (age >= 60) {
      fare = fares.find((item) => item.title === "Pension");
    } else {
      fare = fares.find((item) => item.title === "Default");
    }
    const fare_id = fare?.id ? fare.id : 1;
    sqlQuery += `('${first_name.replaceAll(`'`, " ")}', '${last_name.replaceAll(
      `'`,
      " "
    )}', DATE '${formattedBirthDate}', ${fare_id}, ${user_id}),`;
  }
  sqlQuery = sqlQuery.trim().slice(0, -1);
  sqlQuery += ";";
  const res = await pgClient.query(sqlQuery);
  console.log("Inserted passengers:  ", res.rowCount);
}

module.exports = {
  makePassengers,
};
