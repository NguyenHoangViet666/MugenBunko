import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from '@/components/common/MonochromeIcon';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const handleClearCache = async () => {
    try {
      await AsyncStorage.removeItem('mugen_reading_progress_list');
      Alert.alert('Thành công', 'Đã xoá bộ nhớ tạm tiến độ đọc.');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xoá cache.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const displayName = user?.displayname || user?.username || 'Wibu Độc Giả';
  const username = user?.username ? `@${user.username}` : '@user';
  const roles = user?.roles ? user.roles.join(', ') : 'Độc giả';
  const coins = user?.coins || 0;
  const level = user?.level || 1;
  const xp = user?.xp || 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>TÀI KHOẢN & CÀI ĐẶT</Text>
        </View>

        {/* User Profile Card */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: colors.badgeBg }]}>
            <MonochromeIcon name="user" size={32} color={colors.text} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.userHandle, { color: colors.textMuted }]}>{username}</Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: colors.badgeBg }]}>
                <Text style={[styles.roleText, { color: colors.badgeText }]}>
                  {roles.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text }]}>Cấp {level}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{xp} XP</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text }]}>{coins}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Mugen Xu</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text }]}>
              {user?.bookmarks?.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Bookmarks</Text>
          </View>
        </View>

        {/* Settings Group: Trải nghiệm đọc */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            CÀI ĐẶT ĐỌC SÁCH
          </Text>

          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabelRow}>
                <MonochromeIcon name="type" size={18} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Cỡ chữ mặc định</Text>
              </View>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>18 px</Text>
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabelRow}>
                <MonochromeIcon name="moon" size={18} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Chế độ giao diện</Text>
              </View>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>
                {colorScheme === 'dark' ? 'Charcoal Dark' : 'Washi Paper'}
              </Text>
            </View>

            <Pressable
              onPress={handleClearCache}
              style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.settingLabelRow}>
                <MonochromeIcon name="trash-2" size={18} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Xoá bộ nhớ tạm (Cache)</Text>
              </View>
              <MonochromeIcon name="chevron-right" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Settings Group: Thông tin */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            THÔNG TIN & HỆ THỐNG
          </Text>

          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabelRow}>
                <MonochromeIcon name="info" size={18} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Phiên bản</Text>
              </View>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>1.0.0 (Expo v57)</Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <MonochromeIcon name="feather" size={18} color={colors.text} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Nền tảng</Text>
              </View>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>MugenBunko Mobile</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MonochromeIcon name="arrow-left" size={18} color={colors.accent} />
            <Text style={[styles.logoutText, { color: colors.accent }]}>ĐĂNG XUẤT</Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: 12,
    marginTop: 1,
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingGroup: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 13,
  },
  logoutSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
