import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import apiClient from '../../services/apiClient';

import { SOCKET_URL } from '../../config/env';

const TicketChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { ticketId, topic } = route.params;
  const { token } = useSelector((state: RootState) => state.auth);

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentTicketId, setCurrentTicketId] = useState(ticketId);
  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (currentTicketId) {
      fetchMessages(currentTicketId);
    }

    // Connect to Socket
    socketRef.current = io(SOCKET_URL, {
      query: { token }
    });

    if (currentTicketId) {
      socketRef.current.emit('ticket:join', { ticketId: currentTicketId });
    }

    socketRef.current.on('ticket:receive_message', (message: any) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchMessages = async (id: number) => {
    try {
      const res = await apiClient.get(`/support/tickets/${id}/messages`);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    let activeTicketId = currentTicketId;
    
    // Create ticket if it doesn't exist yet
    if (!activeTicketId) {
      try {
        const res = await apiClient.post('/support/tickets', { topic });
        if (res.data.success) {
          activeTicketId = res.data.ticketId;
          setCurrentTicketId(activeTicketId);
          // Join the newly created ticket room
          socketRef.current.emit('ticket:join', { ticketId: activeTicketId });
        } else {
          console.error('Failed to create ticket');
          return;
        }
      } catch (error) {
        console.error('API Error creating ticket', error);
        return;
      }
    }

    // Emit the message to the socket
    socketRef.current.emit('ticket:message', {
      ticketId: activeTicketId,
      message: inputText.trim(),
      senderType: 'USER'
    });

    setInputText('');
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.sender_type === 'USER';
    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageUserWrapper : styles.messageAdminWrapper]}>
        <View style={[styles.messageBubble, isUser ? styles.messageUser : styles.messageAdmin]}>
          <Text style={[styles.messageText, isUser ? styles.messageUserText : styles.messageAdminText]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{topic}</Text>
            <Text style={styles.headerSubtitle}>
              {currentTicketId ? `Ticket #${currentTicketId}` : 'New Ticket'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Icon name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chatContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  messageUserWrapper: {
    justifyContent: 'flex-end',
  },
  messageAdminWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageUser: {
    backgroundColor: '#000',
    borderBottomRightRadius: 4,
  },
  messageAdmin: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  messageText: {
    fontSize: 15,
  },
  messageUserText: {
    color: '#fff',
  },
  messageAdminText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 45,
    maxHeight: 100,
    marginRight: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default TicketChatScreen;
