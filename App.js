import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, Button, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// --- YOUR KEYS ---
const supabaseUrl = 'https://rxwwjkiwciwfvzwkfydi.supabase.co';
const supabaseAnonKey = 'sb_publishable_D9NJf0Vm3UdB1ztfPqf79g_0TJ9BSm1';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW: Memory for our Upload Form ---
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Function to pull videos from database
  async function fetchVideos() {
    // We added .order() so newest videos show up at the top!
    const { data, error } = await supabase.from('videos').select('*').order('id', { ascending: false });
    if (error) console.error('Error fetching videos:', error);
    else setVideos(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchVideos();
  }, []);

  // --- NEW: Function to send a new video to the database ---
  async function addVideo() {
    if (newTitle === '') {
      Alert.alert("Hold on!", "You need to type a movie title first.");
      return;
    }

    setIsAdding(true);
    const { error } = await supabase.from('videos').insert([
      {
        title: newTitle,
        duration: newDuration || '00:00',
        thumbnail_url: 'https://via.placeholder.com/150', // Keeps the dummy image for now
        views: 0
      }
    ]);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Clear the text boxes and refresh the list
      setNewTitle('');
      setNewDuration('');
      fetchVideos(); 
    }
    setIsAdding(false);
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.details}>{item.duration} • {item.views} Views</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Stream Admin</Text>

      {/* --- NEW: The Upload Form UI --- */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Enter Movie / Vlog Title"
          placeholderTextColor="#888"
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Duration (e.g., 12:30)"
          placeholderTextColor="#888"
          value={newDuration}
          onChangeText={setNewDuration}
        />
        <Button
          title={isAdding ? "Uploading to Server..." : "Add Video"}
          color="#1db954"
          onPress={addVideo}
        />
      </View>

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
  header: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  form: { backgroundColor: '#1a1a1a', padding: 15, marginHorizontal: 20, marginBottom: 20, borderRadius: 8 },
  input: { backgroundColor: '#333', color: '#fff', padding: 10, borderRadius: 5, marginBottom: 10 },
  card: { flexDirection: 'row', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  thumbnail: { width: 120, height: 70, borderRadius: 8, backgroundColor: '#222' },
  info: { marginLeft: 15, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  details: { color: '#aaa', fontSize: 12, marginTop: 4 },
});
