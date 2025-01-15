const express = require('express');
const app = express();
const porta = process.env.PORT || 3000;

const dotenv = require('dotenv');
const openWeatherRoutes = require('../routes/openWeatherRoutes');

dotenv.config();

app.use(express.json()); 

app.get('/', (req, res) => {
    res.send('Servidor Backend está rodando!');
});

app.use('/verify', openWeatherRoutes);

app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});
