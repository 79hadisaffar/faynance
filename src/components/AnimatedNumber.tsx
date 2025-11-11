import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { formatCurrency } from '../utils/helpers';

type Props = {
  value: number;
  duration?: number;
  style?: any;
};

export default function AnimatedNumber({ value, duration = 700, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState<number>(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value, duration, anim]);

  return <>{/* render formatted currency */}
    <>{formatCurrency(display)}</>
  </>;
}
