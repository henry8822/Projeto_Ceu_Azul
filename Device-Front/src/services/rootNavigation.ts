import React from "react";
import { NavigationContainerRef } from "@react-navigation/native";
import { AppStackParamList } from "../routers";

export const navigationRef = React.createRef<NavigationContainerRef<AppStackParamList>>();

export function navigate(name: keyof AppStackParamList, params: any) {
  navigationRef.current?.navigate(name, params);
}
