const { pgClient } = require("../dbClient");

function generateAdditionalServiceQuery() {
  return `INSERT INTO additional_service(name, price) VALUES ('Breakfast', 10), ('Coffe/Tea', 5), ('Water', 1), ('Bedclothes', 10);`;
}

async function genereateWagonsServicesQuery() {
  const { rows: services } = await pgClient.query(
    "SELECT * FROM additional_service;"
  );
  const { rows: wagons } = await pgClient.query("SELECT * FROM wagon;");

  let allowedServices = [];
  let sqlQuery =
    "INSERT INTO wagons_services(wagon_id, additional_service_id) VALUES";
  for (let wagon of wagons) {
    switch (wagon.type.trim()) {
      case "Sleeping":
      case "Female":
        allowedServices = services.filter((item) => item.name !== "Breakfast");
        break;
      case "Standard":
        allowedServices = services
          .filter((item) => item.name !== "Breakfast")
          .filter((item) => item.name !== "Bedclothes");
        break;
        break;
      case "Lux":
        allowedServices = services.filter((item) => item.name !== "Bedclothes");
        break;
      default:
        allowedServices = services
          .filter((item) => item.name !== "Breakfast")
          .filter((item) => item.name !== "Bedclothes");
        break;
    }

    for (let serviceItem of allowedServices) {
      sqlQuery += `(${wagon.id}, ${serviceItem.id}),`;
    }
  }
  sqlQuery = sqlQuery.trim().slice(0, -1);
  sqlQuery += ";";
  return sqlQuery;
}

module.exports = {
  generateAdditionalServiceQuery,
  genereateWagonsServicesQuery,
};
