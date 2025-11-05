import React, { useEffect, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native-paper';
import { toEnglishDigits } from '../utils/helpers';

type Props = {
  label?: string;
  value?: number;
  onChange: (value: number) => void;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'onChange' | 'label' | 'keyboardType'>;

export default function AmountInput({ label = 'مبلغ', value, onChange, ...rest }: Props) {
  const [display, setDisplay] = useState<string>(value && value > 0 ? value.toLocaleString('fa-IR') : '');

  useEffect(() => {
    const v = value || 0;
    const str = v > 0 ? v.toLocaleString('fa-IR') : '';
    if (str !== display) setDisplay(str);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      label={label}
      value={display}
      onChangeText={(t) => {
        const en = toEnglishDigits(t);
        const num = parseInt(en.replace(/[^0-9]/g, '') || '0', 10);
        onChange(num);
        setDisplay(num ? num.toLocaleString('fa-IR') : '');
      }}
      keyboardType="numeric"
      {...rest}
    />
  );
}
