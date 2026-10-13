import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getApiUrl } from '../config/url';

interface PaymentModalProps {
  visible: boolean;
  fare: number;
  driverInfo: any;
  onPaymentComplete: (method: 'CASH' | 'UPI') => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ visible, fare, driverInfo, onPaymentComplete }) => {
  const [tip, setTip] = useState(0);

  const tips = [10, 20, 50];

  const handlePay = (method: 'CASH' | 'UPI') => {
    onPaymentComplete(method);
    setTip(0);
  };

  const total = fare + tip;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Payment Summary</Text>
          </View>
          
          <View style={styles.driverSection}>
             <Image 
               source={{ uri: driverInfo?.photo?.startsWith('http') ? driverInfo.photo : getApiUrl(driverInfo?.photo || '/uploads/default-avatar.png') }} 
               style={styles.driverImg} 
             />
             <Text style={styles.driverName}>{driverInfo?.name || 'Driver'}</Text>
          </View>

          <View style={styles.fareSection}>
            <Text style={styles.fareLabel}>Ride Fare</Text>
            <Text style={styles.fareAmount}>₹{fare}</Text>
          </View>

          <Text style={styles.tipLabel}>Add a tip for {driverInfo?.name || 'the driver'}?</Text>
          <View style={styles.tipRow}>
            {tips.map((t) => (
              <TouchableOpacity key={t} style={[styles.tipBtn, tip === t && styles.tipBtnActive]} onPress={() => setTip(t === tip ? 0 : t)}>
                <Text style={[styles.tipText, tip === t && styles.tipTextActive]}>₹{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
             <Text style={styles.totalLabel}>Total to pay</Text>
             <Text style={styles.totalAmount}>₹{total}</Text>
          </View>

          <Text style={styles.payVia}>Select Payment Method</Text>

          <View style={styles.paymentMethods}>
             <TouchableOpacity style={styles.methodBtn} onPress={() => handlePay('CASH')}>
                <Icon name="cash" size={24} color="#fff" />
                <Text style={styles.methodText}>Pay Cash</Text>
             </TouchableOpacity>

             <TouchableOpacity style={[styles.methodBtn, { backgroundColor: '#1E3A8A' }]} onPress={() => handlePay('UPI')}>
                <Icon name="qrcode-scan" size={24} color="#fff" />
                <Text style={styles.methodText}>Pay via UPI</Text>
             </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
    elevation: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827'
  },
  driverSection: {
    alignItems: 'center',
    marginBottom: 20
  },
  driverImg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    marginBottom: 10
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  fareSection: {
    alignItems: 'center',
    marginBottom: 25
  },
  fareLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5
  },
  fareAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111827'
  },
  tipLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    textAlign: 'center'
  },
  tipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 25
  },
  tipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB'
  },
  tipBtnActive: {
    backgroundColor: '#11704B',
    borderColor: '#11704B'
  },
  tipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563'
  },
  tipTextActive: {
    color: '#fff'
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#11704B'
  },
  payVia: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
    textAlign: 'center'
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15
  },
  methodBtn: {
    flex: 1,
    backgroundColor: '#11704B',
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  methodText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default PaymentModal;
