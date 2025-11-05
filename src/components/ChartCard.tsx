import React from 'react';
import { Dimensions, View, Text } from 'react-native';
import { Card, Title } from 'react-native-paper';
import { BarChart, LineChart } from 'react-native-chart-kit';

type MultiDataset = { name: string; data: number[]; color?: string };

type Props = {
  title: string;
  color?: string;
  labels: string[];
  data?: number[];
  chartType?: 'bar' | 'line';
  multiData?: MultiDataset[];
  // Optional custom legend rendered with RN Text (avoids SVG shaping issues for Persian)
  legendItems?: Array<{ name: string; color?: string }>; 
  // Optional RN-text labels under the x-axis for bar chart (categorical labels)
  xCategories?: string[];
};

export default function ChartCard({ title, color = '#6200ee', labels, data = [], chartType = 'bar', multiData, legendItems, xCategories }: Props) {
  const width = Dimensions.get('window').width - 32;
  const isBarEmpty = chartType === 'bar' && (!data || data.length === 0 || data.every((v) => !v || v === 0));
  const isLineEmpty = chartType === 'line' && (!multiData || multiData.length === 0 || multiData.every((d) => !d.data || d.data.length === 0 || d.data.every((v) => !v || v === 0)));
  return (
    <Card style={{ margin: 16, marginBottom: 8 }}>
      <Card.Content>
        <Title style={{ marginBottom: 8, textAlign: 'center' }}>{title}</Title>
        <View>
          {chartType === 'bar' && !isBarEmpty && (
            <BarChart
              data={{ labels, datasets: [{ data }] }}
              width={width}
              height={200}
              withInnerLines={false}
              segments={3}
              verticalLabelRotation={0}
              chartConfig={{
                color: () => color,
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                labelColor: () => '#666',
                propsForBackgroundLines: { stroke: '#eee' },
                propsForLabels: { fontSize: 10 },
              }}
              fromZero
              showValuesOnTopOfBars
              yAxisLabel=""
              yAxisSuffix=""
              yLabelsOffset={8}
              style={{ marginRight: 16 }}
            />
          )}
          {chartType === 'bar' && isBarEmpty && (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: '#777' }}>داده‌ای برای نمایش موجود نیست</Text>
            </View>
          )}
          {chartType === 'line' && multiData && !isLineEmpty && (
            <LineChart
              data={{ labels, datasets: multiData.map(d => ({ data: d.data, color: () => (d.color || '#888') })) }}
              width={width}
              height={220}
              withInnerLines={false}
              withDots={false}
              bezier
              segments={3}
              verticalLabelRotation={0}
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                labelColor: () => '#666',
                color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                propsForBackgroundLines: { stroke: '#eee' },
                propsForLabels: { fontSize: 10 },
              }}
              fromZero
              yLabelsOffset={8}
              style={{ marginRight: 16 }}
            />
          )}
          {chartType === 'line' && isLineEmpty && (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: '#777' }}>داده‌ای برای نمایش موجود نیست</Text>
            </View>
          )}
          {legendItems && legendItems.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              {legendItems.map((it, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginVertical: 2 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.color || '#888', marginLeft: 6 }} />
                  <Text style={{ fontSize: 12, color: '#333' }}>{it.name}</Text>
                </View>
              ))}
            </View>
          )}
          {chartType === 'bar' && xCategories && xCategories.length > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 6, paddingHorizontal: 8 }}>
              {xCategories.map((t, i) => (
                <Text key={i} style={{ fontSize: 12, color: '#555' }}>{t}</Text>
              ))}
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}
