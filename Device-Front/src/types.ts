export type ForecastItem = {
    dt: number; // Timestamp em segundos
    main: {
        temp: number; // Temperatura atual
        temp_min: number; // Temperatura mínima
        temp_max: number; // Temperatura máxima
        pressure: number; // Pressão atmosférica
        humidity: number; // Umidade
    };
    weather: {
        id: number; // ID da condição climática
        main: string; // Tipo principal do clima 
        description: string; // Descrição detalhada 
        icon: string; // Código do ícone do OpenWeather
    }[];
    clouds: {
        all: number; // Percentual de nuvens
    };
    wind: {
        speed: number; // Velocidade do vento
        deg: number; // Direção do vento
    };
    visibility: number; // Visibilidade em metros
    pop: number; // Probabilidade de precipitação
    rain?: {
        "3h": number; // Volume de chuva nas últimas 3 horas
    };
    snow?: {
        "3h": number; // Volume de neve nas últimas 3 horas
    };
};
