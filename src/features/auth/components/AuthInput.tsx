import React from 'react';
import { View, TextInput, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';

interface AuthInputProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  secureTextEntry?: boolean;
  prefix?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  prefix,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={20} color={Theme.colors.gray[600]} style={styles.icon} />
      {prefix && <Text style={styles.prefix}>{prefix}</Text>}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.gray[400]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
};

import { Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.gray[300],
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 55,
    backgroundColor: Theme.colors.white,
    marginBottom: Theme.spacing.md,
  },
  icon: {
    marginRight: Theme.spacing.sm,
  },
  prefix: {
    fontSize: 16,
    color: Theme.colors.dark,
    marginRight: 5,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Theme.colors.dark,
  },
});
