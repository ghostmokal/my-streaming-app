import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// --- YOUR KEYS ARE ADDED HERE ---
const supabaseUrl = 'https://rxwwjkiwciwfvzwkfydi.supabase.co';
const supabaseAnonKey = 'sb_publishable_D9NJf0Vm3UdB1ztfPqf79g_0TJ9BSm1';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// --------------------------------

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // This function fetches your movies from the database when the app opens
  useEffect(() => {
    async function fetchVideos() {
      const { data, error } = await supabase.from('videos').select('*');
      if (error) console.error('Error fetching videos:', error);
      else setVideos(data);
      setLoading(false);
    }
    fetchVideos();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/150' }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.details}>{item.duration} • {item.views} Views</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Stream</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#00ff00" style={{marginTop: 50}} />
      ) : (
        <FlatList data={videos} renderItem={renderItem} keyExtractor={item => item.id.toString()} />
      )}
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
