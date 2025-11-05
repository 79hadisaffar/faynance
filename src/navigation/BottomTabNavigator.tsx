import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import InstallmentsScreen from '../screens/InstallmentsScreen';
import DebtsScreen from '../screens/DebtsScreen';
import CreditsScreen from '../screens/CreditsScreen';
import ChecksScreen from '../screens/ChecksScreen';
import HeaderSettingsButton from '../components/HeaderSettingsButton';
import { useSettings } from '../theme';
import ExpensesScreen from '../screens/ExpensesScreen';
import AccountsScreen from '../screens/AccountsScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const paperTheme = useTheme();
  const { visibleTabs, colors } = useSettings();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: paperTheme.colors.primary,
        tabBarInactiveTintColor: '#666',
        headerStyle: {
          backgroundColor: paperTheme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <HeaderSettingsButton />,
      }}
    >
      {visibleTabs.dashboard && (
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'داشبورد',
          headerTitle: 'مدیریت مالی',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />)}
      {visibleTabs.installments && (
      <Tab.Screen
        name="Installments"
        component={InstallmentsScreen}
        options={{
          tabBarLabel: 'اقساط',
          headerTitle: 'مدیریت اقساط',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
          ),
        }}
      />)}
      {visibleTabs.debts && (
      <Tab.Screen
        name="Debts"
        component={DebtsScreen}
        options={{
          tabBarLabel: 'بدهی‌ها',
          headerTitle: 'بدهی‌ها',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-minus" size={size} color={color} />
          ),
        }}
      />)}
      {visibleTabs.credits && (
      <Tab.Screen
        name="Credits"
        component={CreditsScreen}
        options={{
          tabBarLabel: 'طلب‌ها',
          headerTitle: 'طلب‌ها',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-plus" size={size} color={color} />
          ),
        }}
      />)}
      {visibleTabs.checks && (
      <Tab.Screen
        name="Checks"
        component={ChecksScreen}
        options={{
          tabBarLabel: 'چک‌ها',
          headerTitle: 'مدیریت چک‌ها',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="checkbook" size={size} color={color} />
          ),
        }}
      />)}
      {visibleTabs.expenses && (
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          tabBarLabel: 'مخارج',
          headerTitle: 'مدیریت مخارج',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash" size={size} color={color} />
          ),
        }}
      />)}
      { (visibleTabs as any).accounts && (
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          tabBarLabel: 'حساب‌ها',
          headerTitle: 'حساب‌ها',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet" size={size} color={color} />
          ),
        }}
      />)}
    </Tab.Navigator>
  );
}
