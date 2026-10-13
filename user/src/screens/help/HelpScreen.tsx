import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../services/apiClient';

const HELP_TOPICS = [
  { id: '1', title: 'Ride fare related Issues', icon: 'moped' },
  { id: '2', title: 'Captain and Vehicle related issues', icon: 'account-hard-hat' },
  { id: '3', title: 'Pass and Payment related Issues', icon: 'cash-multiple' },
  { id: '4', title: 'Parcel Related Issues', icon: 'package-variant' },
  { id: '5', title: 'Other Topics', icon: 'cellphone-cog' },
];

const HelpScreen = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleTopicPress = (topic: string) => {
    navigation.navigate('TicketChat', { ticketId: null, topic });
  };

  const renderTopic = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.topicItem} onPress={() => handleTopicPress(item.title)}>
      <View style={styles.topicIconContainer}>
        <Icon name={item.icon} size={24} color="#666" />
      </View>
      <Text style={styles.topicTitle}>{item.title}</Text>
      <Icon name="chevron-right" size={24} color="#000" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help</Text>
        <TouchableOpacity style={styles.ticketsButton} onPress={() => navigation.navigate('MyTickets')}>
          <Icon name="ticket-confirmation-outline" size={18} color="#000" style={{ marginRight: 4 }} />
          <Text style={styles.ticketsButtonText}>Tickets</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Help topics</Text>
        


        {isCreating ? (
          <View style={{ marginTop: 40 }}>
             <ActivityIndicator size="large" color="#000" />
             <Text style={{ textAlign: 'center', marginTop: 10 }}>Creating ticket...</Text>
          </View>
        ) : (
          <View style={styles.topicsCard}>
            <FlatList
              data={HELP_TOPICS.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={item => item.id}
              renderItem={renderTopic}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>
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
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  ticketsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  ticketsButtonText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginTop: 10,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  topicsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  topicIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  topicTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  }
});

export default HelpScreen;
