import React from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity } from 'react-native';

// Sample data for your movies/vlogs
const DATA = [
  { id: '1', title: 'My First Vlog', thumb: 'https://via.placeholder.com/150', duration: '10:05' },
  { id: '2', title: 'Top 10 Tech Tips', thumb: 'https://via.placeholder.com/150', duration: '05:20' },
  { id: '3', title: 'HSC Chemistry Prep', thumb: 'https://via.placeholder.com/150', duration: '15:45' },
];

export default function App() {
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.details}>{item.duration} • 1.2K Views</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mokal Stream</Text>
      <FlatList data={DATA} renderItem={renderItem} keyExtractor={item => item.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', paddingTop: 50 },
  header: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginLeft: 20, marginBottom: 20 },
  card: { flexDirection: 'row', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  thumbnail: { width: 120, height: 70, borderRadius: 8, backgroundColor: '#222' },
  info: { marginLeft: 15, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  details: { color: '#aaa', fontSize: 12, marginTop: 4 },
});
