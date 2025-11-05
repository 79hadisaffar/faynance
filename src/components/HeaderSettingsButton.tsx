import React from 'react';
import { IconButton } from 'react-native-paper';
import { useSettings } from '../theme';

export default function HeaderSettingsButton() {
  const { openSettings } = useSettings();
  return (
    <IconButton
      icon="menu"
      iconColor="#fff"
      onPress={openSettings}
      accessibilityLabel="تنظیمات"
    />
  );
}
