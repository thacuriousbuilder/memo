

import { Tabs } from 'expo-router'
import { Colors } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

type IconName = React.ComponentProps<typeof Ionicons>['name']

interface TabConfig {
  name:       string
  title:      string
  icon:       IconName
  activeIcon: IconName
}

const TABS: TabConfig[] = [
  {
    name:       'index',
    title:      'Home',
    icon:       'home-outline',
    activeIcon: 'home',
  },
  {
    name:       'courses',
    title:      'Courses',
    icon:       'book-outline',
    activeIcon: 'book',
  },
  {
    name:       'study',
    title:      'Study',
    icon:       'school-outline',
    activeIcon: 'school',
  },
  {
    name:       'profile',
    title:      'Profile',
    icon:       'person-outline',
    activeIcon: 'person',
  },
]

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:     false,
        tabBarStyle: {
          backgroundColor: Colors.tabBackground,
          borderTopColor:  Colors.tabBorder,
          borderTopWidth:  1,
          paddingBottom:   8,
          paddingTop:      8,
          height:          64,
        },
        tabBarActiveTintColor:   Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: '500',
          marginTop:  2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}