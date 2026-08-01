
import { Tabs }     from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  TouchableOpacity, View, StyleSheet
} from 'react-native'
import { Colors } from '@/constants/theme'

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
    title:      'Subjects',
    icon:       'book-outline',
    activeIcon: 'book',
  },
  {
    name:       'create',
    title:      '',
    icon:       'add',
    activeIcon: 'close',
  },
  {
    name:       'study',
    title:      'Study',
    icon:       'library-outline',
    activeIcon: 'library',
  },
  {
    name:       'profile',
    title:      'Profile',
    icon:       'person-outline',
    activeIcon: 'person',
  },
]

function FabButton({
  onPress,
  focused,
}: {
  onPress: (() => void) | null
  focused: boolean
}) {
  return (
    <TouchableOpacity
      style={styles.fabWrapper}
      onPress={onPress ?? undefined}
      activeOpacity={0.8}
    >
      <View style={styles.fab}>
        <Ionicons
          name={focused ? 'close' : 'add'}
          size={28}
          color="#fff"
        />
      </View>
    </TouchableOpacity>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle:             styles.tabBar,
        tabBarLabelStyle:        styles.tabLabel,
      }}
    >
      {TABS.map((tab) => {
        if (tab.name === 'create') {
          return (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title:        '',
                tabBarIcon:   () => null,
                tabBarLabel:  () => null,
                tabBarButton: (props) => (
                  <FabButton
                    onPress={props.onPress as (() => void) | null}
                    focused={props.accessibilityState?.selected ?? false}
                  />
                ),
              }}
            />
          )
        }

        return (
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
        )
      })}
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBackground,
    borderTopColor:  Colors.tabBorder,
    borderTopWidth:  1,
    paddingBottom:   8,
    paddingTop:      8,
    height:          100,
  },
  tabLabel: {
    fontSize:   10,
    fontWeight: '500',
    marginTop:  2,
  },
  fabWrapper: {
    alignItems:     'center',
    justifyContent: 'center',
  
  },
  fab: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    8,
    elevation:       8,
  },
})