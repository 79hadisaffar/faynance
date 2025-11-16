import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

type Props = {
	index?: number;
	style?: StyleProp<ViewStyle>;
	children?: React.ReactNode;
};

export default function AnimatedCard({ index = 0, style, children }: Props) {
	// Animated.Value used for both opacity and translateY
	const anim = useRef(new Animated.Value(0)).current as Animated.Value;

	useEffect(() => {
		const animConfig = Animated.timing(anim, {
			toValue: 1,
			duration: 400,
			delay: Math.min(200 + index * 60, 600),
			useNativeDriver: true,
		});
		animConfig.start();
		return () => animConfig.stop();
	}, [anim, index]);

	const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
	const opacity = anim;

	return (
		<Animated.View style={[{ transform: [{ translateY }] as any, opacity }, style]}>
			{children}
		</Animated.View>
	);
}
