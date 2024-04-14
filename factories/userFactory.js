const { pgClient } = require("../dbClient");
const { faker } = require("@faker-js/faker");
const { pbkdf2: _pbkdf2, randomBytes } = require("node:crypto");
const { promisify } = require("node:util");

const pbkdf2 = promisify(_pbkdf2);

async function makeUsers(count) {
  console.log("Inserting users...");
  const { rows: usersFromDb } = await pgClient.query(`SELECT * FROM "user";`);
  if (usersFromDb.length) {
    return;
  }
  let sqlQuery = `INSERT INTO "user"(phone, email, password, name) VALUES `;
  for (let i = 0; i < count; i++) {
    const phone = faker.phone.number();
    const email = faker.internet.email();
    const name = faker.person.fullName();
    const password = await getSaltedPasswordHash("password");
    sqlQuery += `('${phone}', '${email}', '${password}', '${name.replaceAll(
      "'",
      " "
    )}'),`;
  }
  sqlQuery = sqlQuery.trim().slice(0, -1);
  sqlQuery += ";";
  const res = await pgClient.query(sqlQuery);
  console.log("Inserted users: ", res.rowCount);
}

async function getSaltedPasswordHash(password) {
  const salt = randomBytes(8).toString("hex");
  const hash = await getPasswordHash(password, salt);
  return salt + "." + hash.toString("hex");
}

async function getPasswordHash(password, salt) {
  const hash = await pbkdf2(password, salt, 10000, 32, "sha512");
  return hash;
}

module.exports = {
  makeUsers,
};
