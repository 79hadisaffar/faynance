import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TextStyle, StyleProp } from 'react-native';

type Props = {
	value: number;
	duration?: number;
	style?: StyleProp<TextStyle>;
};

export default function AnimatedNumber({ value, duration = 700, style }: Props) {
	const anim = useRef(new Animated.Value(value)).current;
	const [display, setDisplay] = useState<number>(value);

	useEffect(() => {
		const id = anim.addListener(({ value: v }) => {
			setDisplay(Math.round(v));
		});
		Animated.timing(anim, {
			toValue: value,
			duration,
			useNativeDriver: false,
		}).start(() => {
			anim.removeListener(id);
			setDisplay(value);
		});
		return () => {
			try {
				anim.removeListener(id);
			} catch {}
		};
	}, [value]);

	// Render as localized number (fa-IR if available)
	const text = typeof display === 'number' ? display.toLocaleString('fa-IR') : String(display);

	return <Text style={style}>{text}</Text>;
}
