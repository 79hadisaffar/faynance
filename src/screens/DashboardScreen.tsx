import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import DatabaseService from '../services/database';
import { formatCurrency, isInCurrentJMonth } from '../utils/helpers';

export default function DashboardScreen() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [totalDebts, setTotalDebts] = useState(0);
	const [totalCredits, setTotalCredits] = useState(0);
	const [pendingChecks, setPendingChecks] = useState(0);
	const [monthlyInstallmentsTotal, setMonthlyInstallmentsTotal] = useState(0);

	const load = async () => {
		setLoading(true);
		try {
			const [debts, credits, checks, installments, payments] = await Promise.all([
				DatabaseService.getDebts(),
				DatabaseService.getCredits(),
				DatabaseService.getChecks(),
				DatabaseService.getInstallments(),
				DatabaseService.getAllInstallmentPayments(),
			]);

			const totalD = debts.filter(d => !d.isPaid).reduce((s, d) => s + (d.amount || 0), 0);
			const totalC = credits.filter(c => !c.isReceived).reduce((s, c) => s + (c.amount || 0), 0);
			const pendingCh = checks.filter(ch => ch.status === 'pending').length;

			// Sum installment payments that fall in current Jalali month
			const monthlyPayments = payments.filter(p => isInCurrentJMonth(p.dueDate));
			const installmentsMap = new Map<number, number>();
			installments.forEach(i => { if (i.id) installmentsMap.set(i.id, i.installmentAmount || 0); });
			const monthlyTotal = monthlyPayments.reduce((s, p) => s + (installmentsMap.get(p.installmentId) || 0), 0);

			setTotalDebts(totalD);
			setTotalCredits(totalC);
			setPendingChecks(pendingCh);
			setMonthlyInstallmentsTotal(monthlyTotal);
		} catch (e) {
			console.error('Failed to load dashboard data', e);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	const onRefresh = async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	};

	if (loading) return (
		<View style={styles.center}>
			<ActivityIndicator animating size={48} />
		</View>
	);

	return (
		<ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
			<Card style={styles.card}>
				<Card.Content>
					<Title>مجموع بدهی‌ها</Title>
					<Paragraph>{formatCurrency(totalDebts)}</Paragraph>
				</Card.Content>
			</Card>

			<Card style={styles.card}>
				<Card.Content>
					<Title>مجموع طلب‌ها</Title>
					<Paragraph>{formatCurrency(totalCredits)}</Paragraph>
				</Card.Content>
			</Card>

			<Card style={styles.card}>
				<Card.Content>
					<Title>چک‌های در انتظار</Title>
					<Paragraph>{pendingChecks}</Paragraph>
				</Card.Content>
			</Card>

			<Card style={styles.card}>
				<Card.Content>
					<Title>جمع اقساط این ماه</Title>
					<Paragraph>{formatCurrency(monthlyInstallmentsTotal)}</Paragraph>
				</Card.Content>
			</Card>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
	card: {
		marginBottom: 12,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	}
});
