import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, Button, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';    
import { Video, Audio } from 'expo-av'; // Added Audio here

// --- YOUR KEYS ---
const supabaseUrl = 'https://rxwwjkiwciwfvzwkfydi.supabase.co';
const supabaseAnonKey = 'sb_publishable_D9NJf0Vm3UdB1ztfPqf79g_0TJ9BSm1';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [playingMedia, setPlayingMedia] = useState(null); 

  async function fetchMedia() {
    const { data, error } = await supabase.from('videos').select('*').order('id', { ascending: false });
    if (error) console.error('Error fetching:', error);
    else setMediaList(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchMedia();
  }, []);

  async function pickAndUploadMedia() {
    if (newTitle === '') {
      Alert.alert("Hold on!", "Please type a title first.");
      return;
    }

    // This now allows both Videos AND Audio
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, 
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) return;

    setIsAdding(true);
    try {
      const uri = result.assets[0].uri;
      const fileExt = uri.split('.').pop();
      const fileName = `media_${Date.now()}.${fileExt}`; 

      const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, decode(base64Data), {
        contentType: fileExt === 'mp3' ? 'audio/mpeg' : 'video/mp4'
      });
      
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;

      const { error: dbError } = await supabase.from('videos').insert([
        {
          title: newTitle,
          duration: fileExt === 'mp3' || fileExt === 'm4a' ? 'Audio' : 'Video',
          thumbnail_url: 'https://via.placeholder.com/150',
          video_url: publicUrl,
          views: 0
        }
      ]);
      if (dbError) throw dbError;

      Alert.alert("Success!", "Media uploaded successfully!");
      setNewTitle(''); 
      fetchMedia();   
    } catch (error) {
      Alert.alert("Upload Error", error.message);
    }
    setIsAdding(false);
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setPlayingMedia(item)}>
      <View style={styles.thumbnailPlaceholder}>
        <Text style={{color: '#fff'}}>{item.duration === 'Audio' ? '🎵' : '🎬'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.details}>{item.duration}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mokal Multi-Media</Text>

      {playingMedia ? (
        <View style={styles.playerContainer}>
          <Text style={styles.playingTitle}>{playingMedia.title}</Text>
          {playingMedia.duration === 'Audio' ? (
            <View style={styles.audioVisualizer}>
               <Text style={{fontSize: 50}}>🎵</Text>
               <Text style={{color: '#fff', marginTop: 10}}>Playing Audio Stream...</Text>
               <Video
                source={{ uri: playingMedia.video_url }}
                shouldPlay
                useNativeControls
                style={{ width: 0, height: 0 }} // Hide the video box for audio
              />
            </View>
          ) : (
            <Video
              source={{ uri: playingMedia.video_url }}
              resizeMode="contain"
              shouldPlay
              useNativeControls
              style={styles.videoPlayer}
            />
          )}
          <Button title="Close Player" color="#ff4444" onPress={() => setPlayingMedia(null)} />
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Title (e.g. My Song or Vlog)"
            placeholderTextColor="#888"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <Button
            title={isAdding ? "Uploading..." : "Select Media (Audio/Video)"}
            color="#1db954"
            onPress={pickAndUploadMedia}
            disabled={isAdding}
          />
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#00ff00" style={{marginTop: 50}} />
      ) : (
        <FlatList data={mediaList} renderItem={renderItem} keyExtractor={item => item.id.toString()} />
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
  thumbnailPlaceholder: { width: 80, height: 60, borderRadius: 8, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  info: { marginLeft: 15, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  details: { color: '#aaa', fontSize: 12, marginTop: 4 },
  playerContainer: { backgroundColor: '#1a1a1a', padding: 15, marginHorizontal: 20, marginBottom: 20, borderRadius: 8 },
  playingTitle: { color: '#1db954', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  videoPlayer: { width: '100%', height: 220, backgroundColor: '#000', marginBottom: 15 },
  audioVisualizer: { width: '100%', height: 150, backgroundColor: '#000', marginBottom: 15, justifyContent: 'center', alignItems: 'center', borderRadius: 10 }
});
