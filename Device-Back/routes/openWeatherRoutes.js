const express = require("express");
const { verifyAndSaveCity, updateCitiesAndCheckWeather } = require("../controllers/openWeatherController");

const router = express.Router();

// Rota para verificar e salvar a cidade
router.post("/city/:city", verifyAndSaveCity);

router.post("/notification", updateCitiesAndCheckWeather);

module.exports = router;
