const { pgClient } = require("../dbClient");

function generateFaresQuery() {
  return `INSERT INTO fare(title, discount) VALUES ('Default', 0), ('Student', 40), ('Child', 50), ('Pension', 30);`;
}

module.exports = {
  generateFaresQuery,
};
