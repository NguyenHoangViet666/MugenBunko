import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from './MonochromeIcon';

interface HeaderBarProps {
  title?: string;
  showSearch?: boolean;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title = 'MUGENBUNKO',
  showSearch = true,
  showBack = false,
  rightAction,
}) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MonochromeIcon name="arrow-left" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.brandRow}>
            <Text style={[styles.brandText, { color: colors.text }]}>{title}</Text>
            <View style={[styles.brandDot, { backgroundColor: colors.accent }]} />
          </View>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightAction}

        {showSearch && (
          <Pressable
            onPress={() => router.push('/(tabs)/explore' as any)}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MonochromeIcon name="search" size={20} color={colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 6,
  },
});

export default HeaderBar;
