import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import MonochromeIcon from '@/components/common/MonochromeIcon';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const { login, sendOtp, register } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [mode, setMode] = useState<AuthMode>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Register form state
  const [regUsername, setRegUsername] = useState<string>('');
  const [regDisplayname, setRegDisplayname] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regOtp, setRegOtp] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // OTP State
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Password validation rules for registration
  const hasMinLength = regPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(regPassword);
  const hasNumber = /\d/.test(regPassword);
  const hasSpecialChar = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword);
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;

  const handleSendOtp = async () => {
    setErrorMessage('');
    setOtpSuccessMsg('');

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ Gmail / Email trước khi gửi mã OTP!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Địa chỉ Email không đúng định dạng!');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await sendOtp(cleanEmail);
      if (res.success) {
        setOtpSent(true);
        setOtpCountdown(60);
        const msg = res.devOtp
          ? `Mã OTP đã được tạo: [${res.devOtp}] (Nhập vào bên dưới)`
          : `Mã OTP 6 số đã được gửi đến ${cleanEmail}!`;
        setOtpSuccessMsg(msg);
      } else {
        setErrorMessage(res.error || 'Không thể gửi mã OTP!');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    setErrorMessage('');
    if (!loginUsername.trim() || !loginPassword) {
      setErrorMessage('Vui lòng nhập tên đăng nhập và mật khẩu!');
      return;
    }

    setLoading(true);
    try {
      const res = await login(loginUsername.trim(), loginPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Sai tên đăng nhập hoặc mật khẩu!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    setErrorMessage('');
    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanOtp = regOtp.trim();

    if (!cleanUsername || !regDisplayname.trim() || !cleanEmail || !regPassword) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin đăng ký!');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setErrorMessage('Tên đăng nhập chỉ gồm chữ thường không dấu, số và dấu gạch dưới!');
      return;
    }

    if (!cleanOtp) {
      setErrorMessage('Vui lòng bấm "Gửi mã" và nhập mã OTP 6 số đã gửi về Gmail!');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Mật khẩu chưa đáp ứng đủ 4 tiêu chuẩn bảo mật bên dưới!');
      return;
    }

    setLoading(true);
    try {
      const res = await register(cleanUsername, regDisplayname.trim(), regPassword, cleanEmail, cleanOtp);
      if (!res.success) {
        setErrorMessage(res.error || 'Đăng ký thất bại!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (user: string, pass: string) => {
    setLoginUsername(user);
    setLoginPassword(pass);
    setMode('login');
    setErrorMessage('');
    setOtpSuccessMsg('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.brandTitleRow}>
              <Text style={[styles.brandTitle, { color: colors.text }]}>MUGENBUNKO</Text>
              <View style={[styles.brandDot, { backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
              Thư Viện Light Novel Trực Tuyến
            </Text>
          </View>

          {/* Modal / Card */}
          <View
            style={[
              styles.authCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Modal Header Title */}
            <View style={styles.cardHeader}>
              <Text style={[styles.cardHeading, { color: colors.text }]}>
                {mode === 'login' ? 'Đăng nhập MUGENBUNKO' : 'Đăng ký tài khoản'}
              </Text>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: 'rgba(224,82,117,0.1)', borderColor: colors.accent }]}>
                <MonochromeIcon name="alert-circle" size={16} color={colors.accent} />
                <Text style={[styles.errorText, { color: colors.accent }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Success Message (OTP Sent) */}
            {otpSuccessMsg ? (
              <View style={[styles.successBox, { backgroundColor: 'rgba(46,125,50,0.1)', borderColor: '#2e7d32' }]}>
                <MonochromeIcon name="info" size={16} color="#2e7d32" />
                <Text style={[styles.successText, { color: '#2e7d32' }]}>
                  {otpSuccessMsg}
                </Text>
              </View>
            ) : null}

            {/* ================= LOGIN FORM ================= */}
            {mode === 'login' ? (
              <View>
                <View style={styles.inputField}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Tên đăng nhập hoặc Gmail
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      value={loginUsername}
                      onChangeText={setLoginUsername}
                      placeholder="Nhập username hoặc gmail..."
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      style={[styles.textInput, { color: colors.text }]}
                    />
                  </View>
                </View>

                <View style={styles.inputField}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Mật khẩu
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      placeholder="Nhập mật khẩu..."
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showLoginPassword}
                      style={[styles.textInput, { color: colors.text }]}
                    />
                    <Pressable
                      onPress={() => setShowLoginPassword((p) => !p)}
                      style={styles.eyeBtn}
                    >
                      <MonochromeIcon name="eye" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  disabled={loading}
                  onPress={handleLoginSubmit}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.tint,
                      opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.background }]}>
                      Đăng Nhập
                    </Text>
                  )}
                </Pressable>

                {/* Switch link */}
                <View style={styles.switchRow}>
                  <Text style={[styles.switchText, { color: colors.textMuted }]}>
                    Chưa có tài khoản?{' '}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setMode('register');
                      setErrorMessage('');
                      setOtpSuccessMsg('');
                    }}
                  >
                    <Text style={[styles.switchLink, { color: colors.accent }]}>
                      Đăng ký ngay
                    </Text>
                  </Pressable>
                </View>

                {/* Quick Demo */}
                <View style={[styles.demoRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.demoLabel, { color: colors.textMuted }]}>
                    Tài khoản mẫu:
                  </Text>
                  <Pressable
                    onPress={() => handleQuickDemo('admin', 'MugenBunko@123')}
                    style={[styles.demoChip, { backgroundColor: colors.badgeBg }]}
                  >
                    <Text style={[styles.demoChipText, { color: colors.badgeText }]}>
                      admin
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleQuickDemo('alice_writer', 'Password@123')}
                    style={[styles.demoChip, { backgroundColor: colors.badgeBg }]}
                  >
                    <Text style={[styles.demoChipText, { color: colors.badgeText }]}>
                      alice_writer
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* ================= REGISTER FORM ================= */
              <View>
                {/* 1. Username */}
                <View style={styles.inputField}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Tên đăng nhập (viết liền không dấu)
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      value={regUsername}
                      onChangeText={setRegUsername}
                      placeholder="Tên đăng nhập..."
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      style={[styles.textInput, { color: colors.text }]}
                    />
                  </View>
                </View>

                {/* 2. Display Name */}
                <View style={styles.inputField}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Tên hiển thị độc giả
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      value={regDisplayname}
                      onChangeText={setRegDisplayname}
                      placeholder="Tên hiển thị..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.textInput, { color: colors.text }]}
                    />
                  </View>
                </View>

                {/* 3. Gmail + Send OTP Button */}
                <View style={styles.inputField}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Gmail xác thực
                  </Text>
                  <View style={styles.emailRow}>
                    <View
                      style={[
                        styles.inputWrap,
                        styles.emailInputWrap,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        value={regEmail}
                        onChangeText={setRegEmail}
                        placeholder="vidu@gmail.com"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={[styles.textInput, { color: colors.text }]}
                      />
                    </View>

                    <Pressable
                      disabled={otpLoading || otpCountdown > 0}
                      onPress={handleSendOtp}
                      style={({ pressed }) => [
                        styles.sendOtpBtn,
                        {
                          backgroundColor: colors.tint,
                          opacity: otpLoading || otpCountdown > 0 ? 0.6 : pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      {otpLoading ? (
                        <ActivityIndicator size="small" color={colors.background} />
                      ) : (
                        <Text style={[styles.sendOtpBtnText, { color: colors.background }]}>
                          {otpCountdown > 0 ? `${otpCountdown}s` : 'Gửi mã'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* 4. OTP Code */}
                <View style={styles.inputField}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Mã xác thực OTP (6 chữ số)
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      value={regOtp}
                      onChangeText={setRegOtp}
                      placeholder="Nhập mã OTP 6 số..."
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.textInput, { color: colors.text, letterSpacing: 3, fontWeight: '700' }]}
                    />
                  </View>
                </View>

                {/* 5. Password */}
                <View style={styles.inputField}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Mật khẩu
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      value={regPassword}
                      onChangeText={setRegPassword}
                      placeholder="Nhập mật khẩu..."
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showRegPassword}
                      style={[styles.textInput, { color: colors.text }]}
                    />
                    <Pressable
                      onPress={() => setShowRegPassword((p) => !p)}
                      style={styles.eyeBtn}
                    >
                      <MonochromeIcon name="eye" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  {/* Checklist kiểm tra mật khẩu thời gian thực */}
                  {regPassword.length > 0 && (
                    <View style={[styles.checklistCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={styles.checkItem}>
                        <Text style={[styles.checkIcon, { color: hasMinLength ? '#2e7d32' : colors.textMuted }]}>
                          {hasMinLength ? '✓' : '○'}
                        </Text>
                        <Text style={[styles.checkText, { color: hasMinLength ? '#2e7d32' : colors.textMuted }]}>
                          Tối thiểu 8 ký tự
                        </Text>
                      </View>

                      <View style={styles.checkItem}>
                        <Text style={[styles.checkIcon, { color: hasUpperCase ? '#2e7d32' : colors.textMuted }]}>
                          {hasUpperCase ? '✓' : '○'}
                        </Text>
                        <Text style={[styles.checkText, { color: hasUpperCase ? '#2e7d32' : colors.textMuted }]}>
                          Chứa ít nhất 1 chữ hoa
                        </Text>
                      </View>

                      <View style={styles.checkItem}>
                        <Text style={[styles.checkIcon, { color: hasNumber ? '#2e7d32' : colors.textMuted }]}>
                          {hasNumber ? '✓' : '○'}
                        </Text>
                        <Text style={[styles.checkText, { color: hasNumber ? '#2e7d32' : colors.textMuted }]}>
                          Chứa ít nhất 1 chữ số
                        </Text>
                      </View>

                      <View style={styles.checkItem}>
                        <Text style={[styles.checkIcon, { color: hasSpecialChar ? '#2e7d32' : colors.textMuted }]}>
                          {hasSpecialChar ? '✓' : '○'}
                        </Text>
                        <Text style={[styles.checkText, { color: hasSpecialChar ? '#2e7d32' : colors.textMuted }]}>
                          Chứa ít nhất 1 ký tự đặc biệt (@$!%*?&)
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <Pressable
                  disabled={loading}
                  onPress={handleRegisterSubmit}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.tint,
                      opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.background }]}>
                      Đăng Ký Tài Khoản
                    </Text>
                  )}
                </Pressable>

                {/* Switch link */}
                <View style={styles.switchRow}>
                  <Text style={[styles.switchText, { color: colors.textMuted }]}>
                    Đã có tài khoản?{' '}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setMode('login');
                      setErrorMessage('');
                      setOtpSuccessMsg('');
                    }}
                  >
                    <Text style={[styles.switchLink, { color: colors.accent }]}>
                      Đăng nhập
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  authCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailInputWrap: {
    flex: 1,
  },
  sendOtpBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  sendOtpBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  eyeBtn: {
    padding: 4,
  },
  checklistCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkIcon: {
    fontSize: 13,
    fontWeight: '700',
    width: 14,
  },
  checkText: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryBtn: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    gap: 8,
    flexWrap: 'wrap',
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  demoChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
