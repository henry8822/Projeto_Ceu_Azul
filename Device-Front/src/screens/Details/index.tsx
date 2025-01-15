import React, { useState } from "react";
import {View,Text,StyleSheet,ScrollView,Pressable} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { AppStackParamList } from "../../routers";
import { FontAwesome } from "@expo/vector-icons";
import * as Speech from "expo-speech";

type DetailsProps = {
  route: RouteProp<AppStackParamList, "Details">;
};

const classifyWindSpeed = (speed: number) => {
  if (speed < 1) return "Vento calmo";
  if (speed < 5) return "Vento leve";
  if (speed < 11) return "Vento moderado";
  if (speed < 19) return "Vento forte";
  if (speed < 28) return "Vento muito forte";
  if (speed < 38) return "Vento violento";
  return "Tempestade";
};

export const Details = ({ route }: DetailsProps) => {
  const { details, city } = route.params;

  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastContent, setLastContent] = useState<string>("");

  const readDetails = (item: any, index: number) => {
    if (activeCard === index && paused) {
      
      Speech.speak(lastContent, {
        language: "pt-BR",
        pitch: 1.0,
        rate: 1.0,
        onStart: () => setPaused(false),
        onDone: () => {
          setActiveCard(null);
          setPaused(false);
        },
        onStopped: () => {
          setActiveCard(null);
          setPaused(false);
        },
      });
      return;
    }

    if (activeCard === index && !paused) {
      // Pausar a leitura
      Speech.stop();
      setPaused(true);
      return;
    }

    // Começar uma nova leitura
    Speech.stop();
    const windDescription = classifyWindSpeed(item.wind.speed);

    const content = `
      Data: ${new Date(item.dt * 1000).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}.
      Horário: ${new Date(item.dt * 1000).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}.
      Temperatura de ${item.main.temp.toFixed(1)} graus, com mínima de ${item.main.temp_min.toFixed(
      1
    )} e máxima de ${item.main.temp_max.toFixed(1)} graus.
      Umidade de ${item.main.humidity} por cento.
      ${windDescription}
      ${
        item.rain
          ? `Chuva registrada nas últimas 3 horas: ${item.rain["3h"].toFixed(
              1
            )} milímetros.`
          : ""
      }
      ${
        item.snow
          ? `Neve registrada nas últimas 3 horas: ${item.snow["3h"].toFixed(
              1
            )} milímetros.`
          : ""
      }
      Visibilidade de ${(item.visibility / 1000).toFixed(1)} quilômetros.
      Condição: ${item.weather[0].description}.
    `;

    setLastContent(content);

    Speech.speak(content, {
      language: "pt-BR",
      pitch: 1.0,
      rate: 1.0,
      onStart: () => {
        setActiveCard(index);
        setPaused(false);
      },
      onDone: () => {
        setActiveCard(null);
        setPaused(false);
      },
      onStopped: () => {
        setActiveCard(null);
        setPaused(false);
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.cityName}>
          {city.name}, {city.country}
        </Text>
        <Text style={styles.subtitle}>Detalhes do Clima</Text>
      </View>

      {details.map((item, index) => (
        <View key={index} style={styles.card}>
          <Pressable onPress={() => readDetails(item, index)} style={styles.icon}>
            <FontAwesome
              name={
                activeCard === index
                  ? paused
                    ? "play-circle"
                    : "pause-circle"
                  : "assistive-listening-systems"
              }
              size={32} // Tamanho aumentado para melhorar a área de toque
              color="black"
            />
          </Pressable>
          <Text style={styles.date}>
            {new Date(item.dt * 1000).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
          <Text style={styles.time}>
            {new Date(item.dt * 1000).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.detail}>
            Temperatura: {item.main.temp.toFixed(1)}°C
          </Text>
          <Text style={styles.detail}>
            Mínima: {item.main.temp_min.toFixed(1)}°C / Máxima:{" "}
            {item.main.temp_max.toFixed(1)}°C
          </Text>
          <Text style={styles.detail}>Umidade: {item.main.humidity}%</Text>
          <Text style={styles.detail}>
            Pressão: {item.main.pressure} hPa
          </Text>
          <Text style={styles.detail}>
            Vento: {item.wind.speed.toFixed(1)} m/s, direção {item.wind.deg}° (
            {classifyWindSpeed(item.wind.speed)})
          </Text>
          <Text style={styles.detail}>
            Nuvens: {item.clouds.all}% de cobertura
          </Text>
          {item.rain && (
            <Text style={styles.detail}>
              Chuva (últimas 3h): {item.rain["3h"].toFixed(1)} mm
            </Text>
          )}
          {item.snow && (
            <Text style={styles.detail}>
              Neve (últimas 3h): {item.snow["3h"].toFixed(1)} mm
            </Text>
          )}
          <Text style={styles.detail}>
            Visibilidade: {(item.visibility / 1000).toFixed(1)} km
          </Text>
          <Text style={styles.detail}>
            Descrição: {item.weather[0].description}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  header: {
    padding: 20,
    backgroundColor: "#4a90e2",
    alignItems: "center",
  },
  cityName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 16,
    color: "#fff",
    marginTop: 5,
  },
  card: {
    margin: 10,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  icon: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  date: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  time: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 10,
  },
  detail: {
    fontSize: 14,
    marginVertical: 2,
  },
});
