import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, Button, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';    
import { Video, Audio } from 'expo-av'; // <--- Make sure Audio is here!


const supabaseUrl = 'https://rxwwjkiwciwfvzwkfydi.supabase.co';
const supabaseAnonKey = 'sb_publishable_D9NJf0Vm3UdB1ztfPqf79g_0TJ9BSm1';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default function App() {
  const [view, setView] = useState('stream'); // 'stream' or 'chat'
  const [mediaList, setMediaList] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [msgText, setMsgText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [playingMedia, setPlayingMedia] = useState(null);
  const [userName] = useState('User_' + Math.floor(Math.random() * 1000));

    useEffect(() => {
    fetchMedia();
    fetchChat();

    // The reliable "Auto-Refresh" Listener
    const channel = supabase
      .channel('public:messages') 
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => {
          // This line pushes the new message to the screen instantly
          setChatMessages((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  const fetchMedia = async () => {
    const { data } = await supabase.from('videos').select('*').order('id', { ascending: false });
    setMediaList(data || []);
    setLoading(false);
  };

  const fetchChat = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    setChatMessages(data || []);
  };

  async function uploadAndSend(isChatFile = false) {
    if (!isChatFile && newTitle === '') return Alert.alert("Add a title first!");

    let result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'video/*', 'audio/*', 'application/pdf'] });
    if (result.canceled) return;

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const fileName = `${Date.now()}_${asset.name}`;
      const base64Data = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, decode(base64Data), { contentType: asset.mimeType });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('media').getPublicUrl(fileName).data.publicUrl;

      if (isChatFile) {
        await supabase.from('messages').insert([{ 
            sender: userName, 
            text: asset.name, 
            file_url: publicUrl, 
            file_type: asset.mimeType 
        }]);
      } else {
        await supabase.from('videos').insert([{ 
            title: newTitle, 
            duration: asset.mimeType.startsWith('video') ? 'Video' : 'Audio', 
            thumbnail_url: 'https://via.placeholder.com/150', 
            video_url: publicUrl 
        }]);
        setNewTitle('');
        fetchMedia();
      }
    } catch (e) { Alert.alert("Error", e.message); }
    setIsUploading(false);
  }

  async function sendTextMsg() {
    if (msgText.trim() === '') return;
    await supabase.from('messages').insert([{ sender: userName, text: msgText }]);
    setMsgText('');
  }

  const renderChatItem = ({ item }) => (
    <View style={[styles.msgBubble, item.sender === userName ? styles.myMsg : styles.theirMsg]}>
      <Text style={styles.senderName}>{item.sender}</Text>
      {item.file_url ? (
        <TouchableOpacity onPress={() => Alert.alert("Open File", item.file_url)}>
          {item.file_type.startsWith('image') ? (
            <Image source={{ uri: item.file_url }} style={styles.chatImg} />
          ) : (
            <Text style={styles.fileLink}>📂 {item.text}</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.msgText}>{item.text}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => setView('stream')}><Text style={[styles.navText, view === 'stream' && styles.activeNav]}>Streaming</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setView('chat')}><Text style={[styles.navText, view === 'chat' && styles.activeNav]}>Community Chat</Text></TouchableOpacity>
      </View>

      {view === 'stream' ? (
        <View style={{flex:1}}>
          {playingMedia && (
            <View style={styles.playerSection}>
              <Video source={{ uri: playingMedia.video_url }} useNativeControls shouldPlay style={styles.videoPlayer} resizeMode="contain" />
              <Button title="Close Player" color="#ff4444" onPress={() => setPlayingMedia(null)} />
            </View>
          )}
          <View style={styles.uploadRow}>
            <TextInput style={styles.input} placeholder="Media Title" placeholderTextColor="#888" value={newTitle} onChangeText={setNewTitle} />
            <Button title={isUploading ? "..." : "Upload"} color="#1db954" onPress={() => uploadAndSend(false)} />
          </View>
          <FlatList data={mediaList} renderItem={({item}) => (
            <TouchableOpacity style={styles.card} onPress={() => setPlayingMedia(item)}>
              <Text style={styles.cardIcon}>{item.duration === 'Audio' ? '🎵' : '🎬'}</Text>
              <View><Text style={styles.title}>{item.title}</Text><Text style={styles.details}>{item.duration}</Text></View>
            </TouchableOpacity>
          )} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
          <FlatList data={chatMessages} renderItem={renderChatItem} keyExtractor={i => i.id.toString()} inverted />
          <View style={styles.chatInputRow}>
            <TouchableOpacity style={styles.plusBtn} onPress={() => uploadAndSend(true)}><Text style={{fontSize:24, color:'#fff'}}>+</Text></TouchableOpacity>
            <TextInput style={styles.chatInput} placeholder="Type a message..." placeholderTextColor="#888" value={msgText} onChangeText={setMsgText} />
            <Button title="Send" onPress={sendTextMsg} color="#1db954" />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', paddingTop: 50 },
  nav: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  navText: { color: '#888', fontSize: 18, fontWeight: 'bold' },
  activeNav: { color: '#1db954', borderBottomWidth: 2, borderBottomColor: '#1db954' },
  uploadRow: { flexDirection: 'row', padding: 15, backgroundColor: '#1a1a1a', margin: 10, borderRadius: 8 },
  input: { flex: 1, color: '#fff', marginRight: 10 },
  card: { flexDirection: 'row', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#333', alignItems: 'center' },
  cardIcon: { fontSize: 30, marginRight: 15 },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  details: { color: '#aaa', fontSize: 12 },
  playerSection: { padding: 10, backgroundColor: '#1a1a1a' },
  videoPlayer: { width: '100%', height: 200 },
  chatInputRow: { flexDirection: 'row', padding: 10, backgroundColor: '#1a1a1a', alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: '#333', color: '#fff', borderRadius: 20, paddingHorizontal: 15, marginHorizontal: 10, height: 40 },
  plusBtn: { width: 40, height: 40, backgroundColor: '#333', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  msgBubble: { padding: 10, borderRadius: 10, marginVertical: 5, maxWidth: '80%', marginHorizontal: 10 },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#1db954' },
  theirMsg: { alignSelf: 'flex-start', backgroundColor: '#333' },
  senderName: { fontSize: 10, color: '#eee', marginBottom: 2 },
  msgText: { color: '#fff' },
  chatImg: { width: 200, height: 150, borderRadius: 8 },
  fileLink: { color: '#fff', textDecorationLine: 'underline' }
});
