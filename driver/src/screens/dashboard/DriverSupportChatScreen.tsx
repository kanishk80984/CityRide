import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { ChevronLeft, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SOCKET_URL } from '../../config/env';
import api from '../../services/api';

const DriverSupportChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { topic, ticketId, status } = route.params;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentTicketId, setCurrentTicketId] = useState<number | null>(ticketId || null);
  const [currentStatus, setCurrentStatus] = useState<string>(status || 'OPEN');
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
    if (ticketId) {
      fetchMessages(ticketId);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchMessages = async (id: number) => {
    try {
      const storedToken = await AsyncStorage.getItem('driverToken');
      const res = await api.get(`/api/support/tickets/${id}/messages`);
      const data = res.data;
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  const initChat = async () => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem('driverToken');
      setToken(storedToken);

      if (storedToken) {
        socketRef.current = io(SOCKET_URL, {
          query: { token: storedToken }
        });

        if (ticketId) {
          socketRef.current.emit('ticket:join', { ticketId });
        }

        socketRef.current.on('ticket:receive_message', (message: any) => {
          setMessages(prev => [...prev, message]);
        });
      }
    } catch (e) {
      console.log('Error init chat', e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !token) return;

    let activeTicketId = currentTicketId;
    
    // Create ticket if it doesn't exist yet
    if (!activeTicketId) {
      try {
        const res = await api.post('/api/support/tickets', { topic });
        const data = res.data;
        
        if (data.success) {
          activeTicketId = data.ticketId;
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

    // Clear input immediately for better UX
    const messageToSend = inputText.trim();
    setInputText('');

    // Emit the message to the socket
    socketRef.current.emit('ticket:message', {
      ticketId: activeTicketId,
      message: messageToSend,
      senderType: 'DRIVER'
    });
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isSelf = item.sender_type === 'DRIVER' || item.sender_type === 'USER'; 
    return (
      <View style={[styles.messageWrapper, isSelf ? styles.messageUserWrapper : styles.messageAdminWrapper]}>
        <View style={[styles.messageBubble, isSelf ? styles.messageUser : styles.messageAdmin]}>
          <Text style={[styles.messageText, isSelf ? styles.messageUserText : styles.messageAdminText]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  const reopenTicket = async () => {
    if (!currentTicketId || !token) return;
    // We send a generic message to effectively reopen or just use the socket
    setCurrentStatus('OPEN');
    // If backend had a reopen endpoint we'd call it here
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{topic}</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.headerSubtitle}>
                {currentTicketId ? `Ticket #${currentTicketId}` : 'New Ticket'}
              </Text>
              {currentTicketId && (
                <View style={[styles.statusBadge, currentStatus === 'CLOSED' ? styles.statusClosed : styles.statusOpen]}>
                  <Text style={[styles.statusText, currentStatus === 'CLOSED' ? styles.statusClosedText : styles.statusOpenText]}>
                    {currentStatus}
                  </Text>
                </View>
              )}
            </View>
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

        {currentStatus === 'CLOSED' ? (
          <View style={[styles.closedContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 15 : 15 }]}>
            <Text style={styles.closedText}>This ticket is closed.</Text>
            <TouchableOpacity style={styles.reopenButton} onPress={reopenTicket}>
              <Text style={styles.reopenButtonText}>Reopen Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 15 : 15 }]}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Send size={20} color="#fff" style={{ marginLeft: -2 }} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#059669', // Green theme for eagle fly driver
    borderBottomRightRadius: 4,
  },
  messageAdmin: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
  },
  messageUserText: {
    color: '#ffffff',
  },
  messageAdminText: {
    color: '#111827',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusOpenText: {
    color: '#059669',
  },
  statusClosedText: {
    color: '#DC2626',
  },
  closedContainer: {
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  closedText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  reopenButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reopenButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});

export default DriverSupportChatScreen;
