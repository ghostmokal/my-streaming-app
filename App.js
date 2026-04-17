import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, Button, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker'; // <-- NEW TOOL INSTALLED!

// --- YOUR KEYS ---
const supabaseUrl = 'https://rxwwjkiwciwfvzwkfydi.supabase.co';
const supabaseAnonKey = 'sb_publishable_D9NJf0Vm3UdB1ztfPqf79g_0TJ9BSm1';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function fetchVideos() {
    const { data, error } = await supabase.from('videos').select('*').order('id', { ascending: false });
    if (error) console.error('Error fetching videos:', error);
    else setVideos(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchVideos();
  }, []);

  // --- NEW: The Magic Upload Function ---
  async function pickAndUploadVideo() {
    if (newTitle === '') {
      Alert.alert("Hold on!", "Please type a title for your video first.");
      return;
    }

    // 1. Open the phone's gallery to pick a video
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) return; // User closed the gallery

    setIsAdding(true);
    try {
      const videoUri = result.assets[0].uri;
      
      // 2. Convert the video into a format the cloud understands (a "Blob")
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const fileName = `video_${Date.now()}.mp4`; // Give it a unique name

      // 3. Upload the heavy file to your 'media' bucket
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, blob);
      if (uploadError) throw uploadError;

      // 4. Get the public URL so the world can watch it
      const publicUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;

      // 5. Save the title and the URL to the database
      const { error: dbError } = await supabase.from('videos').insert([
        {
          title: newTitle,
          duration: 'Uploaded',
          thumbnail_url: 'https://via.placeholder.com/150', // We will add custom thumbnails later
          video_url: publicUrl,
          views: 0
        }
      ]);
      if (dbError) throw dbError;

      Alert.alert("Success!", "Video uploaded directly to your cloud!");
      setNewTitle(''); // Clear the text box
      fetchVideos();   // Refresh the list
    } catch (error) {
      Alert.alert("Upload Error", error.message);
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

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Enter Movie / Vlog Title"
          placeholderTextColor="#888"
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <Button
          title={isAdding ? "Uploading... Do not close app!" : "Select Video & Upload"}
          color="#1db954"
          onPress={pickAndUploadVideo}
          disabled={isAdding}
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
