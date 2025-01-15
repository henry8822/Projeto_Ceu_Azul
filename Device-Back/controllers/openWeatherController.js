const axios = require('axios');
const admin = require('firebase-admin');
const { db } = require('../firebase/firebaseConfig');


const apiKey = process.env.OPENWEATHER_API_KEY;
const updateCitiesAndCheckWeather = async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Parâmetro inválido. userId é obrigatório." });
  }
  console.log("Iniciando atualização para o usuário:", userId);
  try {
    // Obtém as cidades do usuário no Firestore
    const citiesSnapshot = await db.collection("users").doc(userId).collection("cities").get();
    if (citiesSnapshot.empty) {
      console.log("Nenhuma cidade encontrada para o usuário:", userId);
      return res.status(200).json({ message: "Nenhuma cidade registrada para este usuário." });
    }
    const results = [];
    // Loop através das cidades do usuário
    for (const cityDoc of citiesSnapshot.docs) {
      const cityName = cityDoc.id;
      console.log(`Consultando dados para a cidade: ${cityName}`);
      if (!cityName) {
        console.error("Erro: Nome da cidade inválido encontrado no Firestore.");
        continue;
      }
      try {
        // Consulta a API OpenWeather para obter previsões
        const forecastResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?q=${cityName},BR&appid=${apiKey}&lang=pt_br&units=metric`
        );
        const forecastData = forecastResponse.data;
        console.log(`Dados obtidos para ${cityName}:`, forecastData.city);
        try {
          // Atualiza os dados no Firestore
          await db
            .collection("users")
            .doc(userId)
            .collection("cities")
            .doc(cityName)
            .set({
              ...forecastData,
              cityName,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          console.log(`Dados atualizados para ${cityName} no Firestore.`);
        } catch (dbError) {
          console.error(`Erro ao salvar os dados de ${cityName} no Firestore:`, dbError.message);
        }
        // Verifica as condições de tempestade
        const today = new Date().toISOString().split("T")[0];
        const severeWeather = forecastData.list.filter((item) => {
          const itemDate = new Date(item.dt * 1000).toISOString().split("T")[0];
          return (
            itemDate === today &&
            item.weather.some((w) =>
              w.description.toLowerCase().includes("chuva forte") ||
              w.description.toLowerCase().includes("ventos fortes") ||
              w.description.toLowerCase().includes("tempestade")
            )
          );
        });
        if (severeWeather.length > 0) {
          console.log(`Alerta de tempo severo detectado para ${cityName}:`, severeWeather);
          results.push({
            cityName,
            alert: `Previsão de ${severeWeather[0].weather[0].description} hoje.`,
            details: severeWeather,
          });
        }
      } catch (apiError) {
        console.error(`Erro ao consultar a API para ${cityName}:`, apiError.message);
      }
    }
    console.log("Resultados finais de alertas:", results);
    return res.status(200).json({
      message: "Atualização e verificação concluídas.",
      alerts: results,
    });
  } catch (error) {
    console.error("Erro ao processar atualização e verificação:", error.message);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
};

const verifyAndSaveCity = async (req, res) => {
    const { city } = req.params;
    const { userId } = req.body;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!userId || !city) {
        return res.status(400).json({ error: "Parâmetros inválidos. userId e city são obrigatórios." });
    }
    const forecastData = {};
    try {
        const forecastResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city},BR&appid=${apiKey}&lang=pt_br&units=metric`
        );
        const forecastData = forecastResponse.data;
        
        await db.collection('users').doc(userId).collection('cities').doc(city).set({
            ...forecastData,
            cityName: city,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        
        return res.json({ exists: true, data: forecastData });

    } catch (error) {
        console.error("Erro ao verificar ou salvar cidade:", error.message, forecastData, userId, city);
        const statusCode = error.response ? error.response.status : 500;
        const errorMessage = error.response ? error.response.data : "Erro interno no servidor";
        return res.status(statusCode).json({ exists: false, error: errorMessage });
    }
};

module.exports = { verifyAndSaveCity, updateCitiesAndCheckWeather };

