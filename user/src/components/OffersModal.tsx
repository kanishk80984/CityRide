import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface OffersModalProps {
  visible: boolean;
  onClose: () => void;
}

const COLORS = {
  primary: '#11704B',
  bg: '#F8F9FA',
  textTitle: '#1f2937',
  textSub: '#6B7280',
};

const OffersModal: React.FC<OffersModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offers</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Icon name="brightness-percent" size={60} color="#cbd5e1" style={{ marginBottom: 15 }} />
          <Text style={styles.title}>No Offers Found</Text>
          <Text style={styles.subtitle}>You currently do not have any active offers or promo codes available for this ride.</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  backBtn: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textTitle },
  
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textTitle, marginBottom: 10 },
  subtitle: { fontSize: 14, color: COLORS.textSub, textAlign: 'center', lineHeight: 22 },
});

export default OffersModal;
