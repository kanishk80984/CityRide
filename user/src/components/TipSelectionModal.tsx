import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ToastAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TipSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  currentTip: number;
  onApplyTip: (tip: number) => void;
}

const TipSelectionModal: React.FC<TipSelectionModalProps> = ({ visible, onClose, currentTip, onApplyTip }) => {
  const [customTip, setCustomTip] = useState(currentTip > 0 ? currentTip.toString() : '');
  
  const tipOptions = [0, 10, 20, 30, 40, 50, 100];

  const handleApply = (amt: number) => {
    if (amt === 0 || currentTip === amt) {
      onApplyTip(0);
      if (currentTip !== 0 && Platform.OS === 'android') {
        ToastAndroid.show('Tip Canceled', ToastAndroid.SHORT);
      }
    } else {
      onApplyTip(amt);
    }
    onClose();
  };

  const handleCustomApply = () => {
    const val = parseInt(customTip);
    if (!isNaN(val) && val >= 0) {
      handleApply(val);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.dragHandle} />
          
          <View style={styles.searchingTipHeader}>
            <Icon name="lightning-bolt" size={24} color="#F59E0B" style={{ marginRight: 10 }} />
            <Text style={styles.searchingTipTitle}>Increase your chances by adding extra</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchingTipOptions}>
            {tipOptions.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.searchingTipBtn, currentTip === amt && styles.searchingTipBtnActive]}
                onPress={() => handleApply(amt)}
                activeOpacity={0.7}
              >
                <Text style={[styles.searchingTipBtnText, currentTip === amt && styles.searchingTipBtnTextActive]}>
                  {amt === 0 ? 'No Tip' : `+ ₹${amt}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.customRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="Custom Amount"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={customTip}
              onChangeText={setCustomTip}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={handleCustomApply} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.6}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -5 }
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20
  },
  searchingTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  searchingTipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  searchingTipOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 20
  },
  searchingTipBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchingTipBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  searchingTipBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  searchingTipBtnTextActive: {
    color: '#166534',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    marginBottom: 20
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 15,
    marginRight: 5
  },
  input: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    paddingVertical: 0
  },
  applyBtn: {
    backgroundColor: '#11704B',
    height: 40,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  closeBtn: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14
  },
  closeBtnText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: 'bold'
  }
});
export default TipSelectionModal;
