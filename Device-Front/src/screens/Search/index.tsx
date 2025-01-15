import { FontAwesome, Feather } from "@expo/vector-icons";
import React, { useEffect, useState, useRef } from "react";
import {View,Text,TextInput,Image,StyleSheet,Pressable,LogBox,Animated,Dimensions,ActivityIndicator,Alert,} from "react-native";
import Voice, { SpeechResultsEvent } from "@react-native-voice/voice";
import * as Speech from "expo-speech";
import { LinearGradient } from "expo-linear-gradient";
import { NavigationProp } from "@react-navigation/native";
import { AppStackParamList } from "../../routers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

LogBox.ignoreLogs(["new NativeEventEmitter"]);

type SearchProps = {
  navigation: NavigationProp<AppStackParamList>;
  route?: {
    params?: {
      cityName?: string; // Nome da cidade recebida pela notificação
    };
  };
};

const { width, height } = Dimensions.get("window");

export const Search = ({ navigation, route }: SearchProps) => {
  const [search, setSearch] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cityExists, setCityExists] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const numClouds = 5;
  const cloudPositions = Array.from({ length: numClouds }, () =>
    useRef(new Animated.Value(-width)).current
  );
  const cloudHeights = Array.from({ length: numClouds }, () => 30 + Math.random() * 20);

  const numDrops = 20;
  const dropAnimations = Array.from({ length: numDrops }, () =>
    useRef(new Animated.Value(0)).current
  );
  const dropPositions = Array.from({ length: numDrops }, () => Math.random() * width);

  useEffect(() => {
    cloudPositions.forEach((position, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(position, {
            toValue: width,
            duration: 10000 + index * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(position, {
            toValue: -width,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    dropAnimations.forEach((drop, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(drop, {
            toValue: 1,
            duration: 2000 + index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(drop, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [cloudPositions, dropAnimations]);

  const getDropStyle = (drop: Animated.Value, index: number) => ({
    transform: [
      {
        translateY: drop.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, height],
        }),
      },
    ],
    opacity: drop.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [0, 0.8, 0],
    }),
    left: dropPositions[index],
  });

  useEffect(() => {
    const checkInternetConnection = async () => {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        loadOfflineData();
      }
    };

    checkInternetConnection();
  }, []);

  const loadOfflineData = async () => {
    try {
      const offlineData = await AsyncStorage.getItem("@last_forecast");
      if (offlineData) {
        const data = JSON.parse(offlineData);
        navigation.navigate("Home", { cityData: data });
        Alert.alert("Offline", "Carregando dados salvos localmente.");
      } else {
        Alert.alert("Erro", "Nenhum dado local encontrado.");
      }
    } catch (error) {
      console.error("Erro ao carregar dados locais:", error);
    }
  };

  useEffect(() => {
    if (route?.params?.cityName) {
      setSearch(route.params.cityName);
      verifyCity(route.params.cityName);
    }
  }, [route?.params?.cityName]);

  async function verifyCity(cityToVerify: string) {
    setLoading(true);
    setMessage("");
    setCityExists(null);

    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        setMessage("Erro: ID do usuário não encontrado.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://device-back.onrender.com/verify/city/${cityToVerify}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.exists && result.data) {
          setCityExists(true);
          setMessage(`Cidade encontrada: ${result.data.cityName || cityToVerify}`);
          await AsyncStorage.setItem("@last_forecast", JSON.stringify(result.data));
          navigation.navigate("Home", { cityData: result.data });
        } else {
          setCityExists(false);
          setMessage("Erro: Cidade não encontrada ou dados ausentes.");
        }
      } else {
        const errorText = await response.text();
        setMessage(`Erro ao verificar cidade: ${errorText}`);
      }
    } catch (error) {
      setMessage("Erro: Não foi possível verificar a cidade.");
    } finally {
      setLoading(false);
    }
  }

  function onSpeechResults({ value }: SpeechResultsEvent) {
    const text = value ? value.join(" ") : "";
    setSearch(text);
    verifyCity(text);
  }

  async function startListening() {
    setSearch("");
    setIsListening(true);
    await Voice.start("pt-BR");
  }

  async function stopListening() {
    await Voice.stop();
    setIsListening(false);
  }

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Função para alternar o estado de reprodução de voz
  const toggleSpeech = () => {
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
    } else {
      readScreenContent();
    }
  };

  // Função para ler o conteúdo da tela
  const readScreenContent = () => {
    const content = `
      Boas vindas ao Céu Azul. Escolha um local para ver a previsão do tempo.
      Você pode buscar um local digitando no campo de busca ou utilizando o microfone.
      ${search ? `Você está buscando por: ${search}.` : ""}
      ${message ? message : ""}
    `;

    Speech.speak(content, {
      language: "pt-BR",
      pitch: 1.0,
      rate: 1.0,
      onStart: () => setIsPlaying(true),
      onDone: () => setIsPlaying(false),
      onStopped: () => setIsPlaying(false),
    });
  };

  return (
    <View style={styles.container}>
      {cloudPositions.map((position, index) => (
        <Animated.Image
          key={index}
          source={require("../../../assets/nuvem_animation.png")}
          style={[
            styles.cloudImage,
            {
              transform: [{ translateX: position }],
              top: cloudHeights[index],
            },
          ]}
        />
      ))}

      <View style={styles.dropContainer}>
        {dropAnimations.map((drop, index) => (
          <Animated.View key={index} style={[styles.drop, getDropStyle(drop, index)]} />
        ))}
      </View>

      <View style={styles.header}>
        <Image source={require("../../../assets/Logo.png")} style={styles.appIcon} />
        <LinearGradient
          style={styles.appNameGradient}
          colors={["#223c53", "#368eb4", "#223c53"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        >
          <Text style={styles.appName}>Céu Azul</Text>
        </LinearGradient>
        <Pressable onPress={toggleSpeech} style={styles.soundIcon}>
          <FontAwesome
            name={isPlaying ? "stop-circle" : "assistive-listening-systems"}
            size={28}
            color="black"
          />
        </Pressable>
      </View>

      <Text style={styles.welcomeText}>Boas vindas ao Céu Azul</Text>
      <Text style={styles.subtitleText}>Escolha um local para ver a previsão do tempo</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar local"
        value={search}
        editable={false}
      />
      <Text>{message}</Text>

      {loading && <ActivityIndicator size="large" color="#00796b" style={styles.loadingIndicator} />}

      <Pressable
        onPressIn={startListening}
        onPressOut={stopListening}
        style={({ pressed }) => [
          styles.microphoneIcon,
          pressed && styles.microphonePressed,
        ]}
      >
        <Feather name="mic" size={28} color="black" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0f7fa",
    padding: 20,
  },
  header: {
    position: "absolute",
    top: 50,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  appNameGradient: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#d3e9ed",
    alignSelf: "center",
  },
  soundIcon: {
    padding: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00796b",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 16,
    color: "#00796b",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#00796b",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: "#ffffff",
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  microphoneIcon: {
    position: "absolute",
    bottom: 50,
    padding: 10,
    borderRadius: 50,
  },
  microphonePressed: {
    backgroundColor: "rgba(128, 128, 128, 0.5)",
    padding: 15,
  },
  cloudImage: {
    position: "absolute",
    width: width * 0.5,
    height: 100,
    resizeMode: "cover",
  },
  dropContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    overflow: "hidden",
  },
  drop: {
    width: 5,
    height: 15,
    backgroundColor: "#4169E1",
    borderRadius: 5,
    position: "absolute",
  },
});

