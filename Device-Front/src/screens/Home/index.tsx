import { NavigationProp, RouteProp } from "@react-navigation/native";
import {SafeAreaView,View,Text,StyleSheet,Image,Dimensions,TouchableOpacity,Pressable} from "react-native";
import { useState, useMemo } from "react";
import * as Speech from "expo-speech";
import { AppStackParamList } from "../../routers";
import { FontAwesome } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

type HomeProps = {
  navigation: NavigationProp<AppStackParamList>;
  route: RouteProp<AppStackParamList, "Home">;
};

type ForecastItem = {
  dt: number;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  clouds: {
    all: number;
  };
  visibility: number;
  pop: number;
};

type CityData = {
  city: {
    name: string;
    country: string;
  };
  list: ForecastItem[];
};

export const Home = ({ route, navigation }: HomeProps) => {
  const cityData = route.params?.cityData as unknown as CityData;
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!cityData || !cityData.list || cityData.list.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Nenhuma cidade carregada.</Text>
      </SafeAreaView>
    );
  }

  const calculateDailyTemperatures = (forecastList: ForecastItem[]) => {
    const dailyData: Record<
      string,
      { temps: number[]; minTemp: number; maxTemp: number; weather: any }
    > = {};

    forecastList.forEach((item) => {
      const date = new Date(item.dt * 1000).toLocaleDateString("pt-BR");

      if (!dailyData[date]) {
        dailyData[date] = {
          temps: [],
          minTemp: item.main.temp_min,
          maxTemp: item.main.temp_max,
          weather: item.weather[0],
        };
      }

      dailyData[date].temps.push(item.main.temp);
      dailyData[date].minTemp = Math.min(dailyData[date].minTemp, item.main.temp_min);
      dailyData[date].maxTemp = Math.max(dailyData[date].maxTemp, item.main.temp_max);
    });

    const dailyAverages = Object.keys(dailyData).map((date) => {
      const { temps, minTemp, maxTemp, weather } = dailyData[date];
      const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;

      return {
        date,
        temp_min: parseFloat(minTemp.toFixed(1)),
        temp_max: parseFloat(maxTemp.toFixed(1)),
        temp_avg: parseFloat(avgTemp.toFixed(1)),
        weather,
      };
    });

    return dailyAverages;
  };

  const groupedForecasts = calculateDailyTemperatures(cityData.list);

  const currentDayForecasts = groupedForecasts[currentDayIndex] || {};

  const getBackgroundImage = (description: string) => {
    const images: Record<string, number> = {
      "ceu limpo": require("../../../assets/clear-sky.jpg"),
      "algumas nuvens": require("../../../assets/few-clouds.jpg"),
      'chuva': require("../../../assets/rain.jpg"),
      'tempestade': require("../../../assets/thunderstorm.png"),
      'neve': require("../../../assets/snow.jpg"),
      'nevoa': require("../../../assets/mist.jpg"),
      "nublado": require("../../../assets/overcast-clouds.jpg"),
    };

    return images[description?.toLowerCase()] || require("../../../assets/clear-sky.jpg");
  };

  const backgroundImage = useMemo(
    () => getBackgroundImage(currentDayForecasts.weather?.description || ""),
    [currentDayForecasts]
  );

  const textColor = "#000";

  const readScreenContent = () => {
    const content = `
      Previsão para ${currentDayForecasts.date}.
      Cidade: ${cityData.city.name}.
      Temperatura média de ${currentDayForecasts.temp_avg} graus.
      Mínima de ${currentDayForecasts.temp_min} graus.
      Máxima de ${currentDayForecasts.temp_max} graus.
      Condição de tempo: ${currentDayForecasts.weather?.description}.
    `;

    Speech.speak(content, {
      language: "pt-BR",
      pitch: 1.0,
      rate: 1.0,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      readScreenContent();
    }
  };

  const handleCardPress = () => {
    const selectedDayForecasts = cityData.list.filter((item) => {
      const itemDate = new Date(item.dt * 1000).toLocaleDateString("pt-BR");
      return itemDate === currentDayForecasts.date;
    });
  
    navigation.navigate("Details", {
      details: selectedDayForecasts,
      city: cityData.city,
    });
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <Image source={backgroundImage} style={styles.backgroundImage} />

      <Pressable onPress={toggleSpeech} style={styles.soundIcon}>
        <FontAwesome
          name={isSpeaking ? "stop-circle" : "assistive-listening-systems"}
          size={28}
          color="white"
        />
      </Pressable>

      <TouchableOpacity onPress={handleCardPress} style={styles.card}>
        <Text style={[styles.cityName, { color: textColor }]}>
          {cityData.city.name}, {cityData.city.country}
        </Text>
        <Text style={[styles.date, { color: textColor }]}>
          {currentDayForecasts.date}
        </Text>
        <View style={styles.tempContainer}>
          <Text style={[styles.currentTemp, { color: textColor }]}>
            {currentDayForecasts.temp_avg}°C
          </Text>
          <Text style={[styles.tempRange, { color: textColor }]}>
            {currentDayForecasts.temp_min}°C / {currentDayForecasts.temp_max}°C
          </Text>
        </View>
        <Image
          style={styles.weatherIcon}
          source={{
            uri: `https://openweathermap.org/img/wn/${currentDayForecasts.weather?.icon}@4x.png`,
          }}
        />
        <Text style={[styles.description, { color: textColor }]}>
          {currentDayForecasts.weather?.description || ""}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentDayIndex === 0 && styles.disabledButton]}
          onPress={() => currentDayIndex > 0 && setCurrentDayIndex(currentDayIndex - 1)}
          disabled={currentDayIndex === 0}
        >
          <Text style={styles.navButtonText}>← Dia Anterior</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentDayIndex === groupedForecasts.length - 1 && styles.disabledButton,
          ]}
          onPress={() =>
            currentDayIndex < groupedForecasts.length - 1 &&
            setCurrentDayIndex(currentDayIndex + 1)
          }
          disabled={currentDayIndex === groupedForecasts.length - 1}
        >
          <Text style={styles.navButtonText}>Próximo Dia →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: "100%",
    height: "100%",
  },
  soundIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 10,
  },
  card: {
    marginTop: 50,
    width: width * 0.9,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#ffffff",
  },
  cityName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  date: {
    fontSize: 16,
    marginBottom: 10,
  },
  tempContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  currentTemp: {
    fontSize: 64,
    fontWeight: "bold",
  },
  tempRange: {
    fontSize: 16,
  },
  weatherIcon: {
    width: 100,
    height: 100,
    marginVertical: 10,
  },
  description: {
    fontSize: 16,
    textTransform: "capitalize",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 10,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    padding: 10,
  },
  navButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 18,
    color: "#ff0000",
    textAlign: "center",
    marginTop: 20,
  },
});
