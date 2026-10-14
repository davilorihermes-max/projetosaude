// mobile/src/components/Header.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { UserRole, Professional } from '../types';

interface HeaderProps {
  theme: ColorTheme;
  role: UserRole;
  onToggleRole: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  professional: Professional;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  role,
  onToggleRole,
  isDark,
  onToggleDark,
  professional,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.headerBackground,
          borderBottomColor: theme.headerBorder,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="pulse" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
              Omni<Text style={{ color: theme.primary }}>Saúde</Text>
            </Text>
            <Text style={[styles.brandSubtitle, { color: theme.textMuted }]}>
              {role === 'PROFESSIONAL' ? 'Home Care Mobile' : 'Coordenação Clínica'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {/* Toggle Role Button */}
          <TouchableOpacity
            onPress={onToggleRole}
            activeOpacity={0.8}
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  role === 'PROFESSIONAL' ? theme.primaryMuted : theme.infoBg,
                borderColor:
                  role === 'PROFESSIONAL' ? theme.primary : theme.info,
              },
            ]}
          >
            <Ionicons
              name={role === 'PROFESSIONAL' ? 'medkit' : 'business'}
              size={14}
              color={role === 'PROFESSIONAL' ? theme.primaryDark : theme.info}
            />
            <Text
              style={[
                styles.roleText,
                {
                  color:
                    role === 'PROFESSIONAL' ? theme.primaryDark : theme.info,
                },
              ]}
            >
              {role === 'PROFESSIONAL' ? 'Campo' : 'Gestão'}
            </Text>
          </TouchableOpacity>

          {/* Dark Mode Toggle */}
          <TouchableOpacity
            onPress={onToggleDark}
            activeOpacity={0.7}
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.surfaceVariant,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={18}
              color={isDark ? theme.warning : theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile quick bar (Only for Professional mode) */}
      {role === 'PROFESSIONAL' && (
        <View
          style={[
            styles.profileBar,
            {
              backgroundColor: theme.surfaceVariant,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <Image
            source={{ uri: professional.avatar }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profName, { color: theme.textPrimary }]}>
              {professional.name}
            </Text>
            <Text style={[styles.profCouncil, { color: theme.textSecondary }]}>
              {professional.councilNumber} • {professional.profession}
            </Text>
          </View>
          <View
            style={[
              styles.onlinePill,
              { backgroundColor: theme.successBg, borderColor: theme.success },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: theme.success }]} />
            <Text style={[styles.onlineText, { color: theme.success }]}>
              Em Rota
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 48,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  profName: {
    fontSize: 14,
    fontWeight: '700',
  },
  profCouncil: {
    fontSize: 11,
    fontWeight: '500',
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
