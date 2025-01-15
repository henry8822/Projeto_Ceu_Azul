import React, { useEffect, useState, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Routes } from "./routers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { navigationRef } from "./services/rootNavigation"; // Ref para navegação


const BACKGROUND_TASK_NAME = "background-fetch";

// Configuração do comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const lastNotificationResponse = Notifications.useLastNotificationResponse(); // Captura a última resposta de notificação

  // Inicializa o User ID
  const initializeUserId = async () => {
    try {
      let id = await AsyncStorage.getItem("userId");
      if (!id) {
        id = uuid.v4(); // Gera um UUID único para o usuário
        await AsyncStorage.setItem("userId", id as string);
        console.log("User ID gerado e salvo:", id);
      } else {
        console.log("User ID já existente:", id);
      }
      setUserId(id);
      return id;
    } catch (error) {
        console.error("Erro ao inicializar User ID:", error);
    }
  };

  // Registra a tarefa em segundo plano
  const registerBackgroundTask = async () => {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn("Background Fetch não está habilitado.");
      return;
    }

    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 30 * 10, // 15 minutos
        stopOnTerminate: false, // Continua rodando mesmo após o app ser encerrado
        startOnBoot: true, // Recomeça após o dispositivo ser reiniciado
      });
      console.log("Tarefa de background registrada com sucesso.");
    } catch (error) {
      console.error("Erro ao registrar a tarefa de background:", error);
    }
  };

  // Inicialização
  useEffect(() => {
    initializeUserId().then((id) => {
      if (id) sendUserIdPeriodically(id);
    });
    registerBackgroundTask();
  }, []);

  // Lida com a última notificação
  useEffect(() => {
    if (lastNotificationResponse?.notification?.request?.content?.data) {
      const { route, cityName } = lastNotificationResponse.notification.request.content.data;
      console.log("Navegando para:", route, "com a cidade:", cityName);

      if (route && cityName) {
        navigationRef.current?.navigate(route, { cityName });
      }
    }
  }, [lastNotificationResponse]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Routes />
    </NavigationContainer>
  );
}

// Função para enviar User ID
const sendUserId = async () => {
  const id = await AsyncStorage.getItem("userId");
  if (id) {
    await sendUserIdPeriodically(id);
  }
};

// Envia o User ID periodicamente para o back-end
const sendUserIdPeriodically = async (id: string) => {
  const sendRequest = async () => {
    console.log("Enviando ID do usuário para o servidor...");
    try {
      const response = await fetch("https://device-back.onrender.com/verify/notification", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: id }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Resposta do servidor:", data);

        if (data.alerts && data.alerts.length > 0) {
          data.alerts.forEach(async (alert: { alert: string; cityName: string }) => {
            console.log(`Agendando notificação para a cidade: ${alert.cityName}`);
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "⚠️ Alerta de Tempestade",
                body: `Previsão de chuva forte na cidade ${alert.cityName} hoje.`,
                data: { route: "Search", cityName: alert.cityName },
              },
              trigger: null,
            });
          });
        }
      } else {
        console.error("Erro ao enviar ID do usuário:", response.status);
      }
    } catch (error) {
      console.error("Erro de rede ao enviar ID do usuário:", error);
    }
  };

  console.log("Iniciando envio...");
  sendRequest();
  const interval = setInterval(sendRequest, 30 * 1000); // 30 segundos
  
  return () => clearInterval(interval);
};

// Tarefa em segundo plano
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  console.log("Executando tarefa em segundo plano...");
  try {
    await sendUserId();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Erro ao executar a tarefa de background:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});