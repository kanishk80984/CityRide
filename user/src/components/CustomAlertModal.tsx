import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  info: '#3b82f6',
  textTitle: '#1f2937',
  textSub: '#4b5563',
};

const CustomAlertModal: React.FC<CustomAlertModalProps> = ({ visible, title, message, type = 'info', onClose }) => {
  let iconName = 'information';
  let iconColor = COLORS.info;

  if (type === 'success') {
    iconName = 'check-circle';
    iconColor = COLORS.success;
  } else if (type === 'error') {
    iconName = 'alert-circle';
    iconColor = COLORS.error;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Icon name={iconName} size={48} color={iconColor} style={{ marginBottom: 15 }} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity style={[styles.okBtn, { backgroundColor: iconColor }]} onPress={onClose}>
            <Text style={styles.okBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textTitle,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  okBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  okBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomAlertModal;
