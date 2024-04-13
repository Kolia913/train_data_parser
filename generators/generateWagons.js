const { pgClient } = require("../dbClient");
const { faker } = require("@faker-js/faker");
const wagonTypes = [
  {
    type: "Sleeping",
    priceModifier: 1.2,
  },
  {
    type: "Standard",
    priceModifier: 1,
  },
  {
    type: "Female",
    priceModifier: 1.1,
  },
  {
    type: "Lux",
    priceModifier: 1.5,
  },
];
async function generateWagonsQuery() {
  const { rows: trainsFromDb } = await pgClient.query("SELECT * FROM train;");
  const baseWagonRentalPrice = 35000;

  const trainClasses = [
    { class: "B", priceModifier: 1.1 },
    { class: "P", priceModifier: 1.3 },
    { class: "S", priceModifier: 1 },
    { class: "E", priceModifier: 1.4 },
    { class: "L", priceModifier: 1.05 },
    { class: "I", priceModifier: 1.5 },
  ];
  let sqlQuery =
    "INSERT INTO wagon(number, type, rental_price, train_id) VALUES ";
  for (let train of trainsFromDb) {
    const trainId = train.id;
    const number = faker.number.int({
      min: 2,
      max: 20,
    });
    const typeObj = getWagonType(train.class);
    const type = typeObj.type;
    const rental_price =
      baseWagonRentalPrice *
      trainClasses.find((item) => item.class.trim() === train.class.trim())
        .priceModifier *
      typeObj.priceModifier;
    sqlQuery += `('${number}', '${type}', ${rental_price}, ${trainId}),`;
  }
  sqlQuery = sqlQuery.trim().slice(0, -1);
  sqlQuery += ";";
  return sqlQuery;
}

function getWagonType(trainClass) {
  let availableTypes = [];
  if (trainClass === "I") {
    availableTypes = [
      {
        type: "Standard",
        priceModifier: 1,
      },
      {
        type: "Lux",
        priceModifier: 1.5,
      },
    ];
  } else if (trainClass === "L") {
    availableTypes = [
      {
        type: "Sleeping",
        priceModifier: 1.2,
      },
      {
        type: "Standard",
        priceModifier: 1,
      },
    ];
  } else if (trainClass === "E") {
    availableTypes = [
      {
        type: "Sleeping",
        priceModifier: 1.2,
      },
      {
        type: "Standard",
        priceModifier: 1,
      },
      {
        type: "Female",
        priceModifier: 1.1,
      },
    ];
  } else if (trainClass === "S") {
    availableTypes = [
      {
        type: "Standard",
        priceModifier: 1,
      },
      {
        type: "Female",
        priceModifier: 1.1,
      },
    ];
  } else {
    availableTypes = [...wagonTypes];
  }
  return availableTypes[
    faker.number.int({
      min: 0,
      max: availableTypes.length - 1,
    })
  ];
}

module.exports = {
  generateWagonsQuery,
};
