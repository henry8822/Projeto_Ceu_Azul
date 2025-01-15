import { createStackNavigator } from "@react-navigation/stack"; 
import { Home, Details, Search } from "../screens";
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ForecastItem } from '../types';


export type CityData = {
  city: {
    name: string;
    country: string;
  };
  list: ForecastItem[];
};

export type AppStackParamList = {
    Home: { cityData: undefined };
    Details: { details: ForecastItem[]; city: { name: string; country: string } };
    Search: { cityData?: any; cityName?: string }; 
  };
  

type HomeScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<AppStackParamList, 'Home'>;

export type HomeProps = {
    navigation: HomeScreenNavigationProp;
    route: HomeScreenRouteProp;
};

const AppRoutes = createStackNavigator<AppStackParamList>();

export const Routes = () => {
    return (
        <AppRoutes.Navigator initialRouteName="Search">
            <AppRoutes.Screen name="Home" component={Home} options={{headerShown: false }} />
            <AppRoutes.Screen name="Details" component={Details} options={{headerShown: false }}/>
            <AppRoutes.Screen name="Search" component={Search} options={{headerShown: false }}/>
        </AppRoutes.Navigator>
    );
}