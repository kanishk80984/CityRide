import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PaymentSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  fareAmount: number;
}

const COLORS = {
  primary: '#11704B',
  bg: '#F8F9FA',
  textTitle: '#1f2937',
  textSub: '#6B7280',
  cardBg: '#fff',
  border: '#e5e7eb',
};

const PaymentSelectionModal: React.FC<PaymentSelectionModalProps> = ({
  visible,
  onClose,
  selectedMethod,
  onSelectMethod,
  fareAmount
}) => {
  const handleSelect = (method: string) => {
    onSelectMethod(method);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Total Fare */}
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            <Text style={styles.fareAmount}>₹{fareAmount}</Text>
          </View>

          <View style={styles.dividerDashed} />

          {/* Amazon Pay */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconWrapper, { backgroundColor: '#000' }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>pay</Text>
              </View>
              <Text style={styles.rowText}>AmazonPay</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>LINK</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* UPI Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>UPI</Text>
            <Text style={styles.sectionSubtitle}> Pay by any UPI app</Text>
          </View>

          <View style={styles.cardGroup}>
            {[
              { id: 'super.money UPI', icon: 'alpha-s-circle', color: '#6366f1' },
              { id: 'GPay', icon: 'google', color: '#ea4335' },
              { id: 'HDFC Bank App', icon: 'bank', color: '#1e3a8a' },
            ].map((item, index) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity style={styles.row} onPress={() => handleSelect(item.id)}>
                  <Icon name={item.icon} size={24} color={item.color} style={{ marginRight: 15 }} />
                  <Text style={styles.rowText}>{item.id}</Text>
                  <Icon 
                    name={selectedMethod === item.id ? 'radiobox-marked' : 'radiobox-blank'} 
                    size={24} 
                    color={selectedMethod === item.id ? '#1e3a8a' : '#9ca3af'} 
                  />
                </TouchableOpacity>
                {index < 2 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row}>
              <Icon name="triangle" size={20} color="#ea4335" style={{ marginRight: 15 }} />
              <Text style={styles.rowText}>Pay by any UPI app</Text>
              <Text style={styles.linkText}>CHOOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Pay Later */}
          <Text style={[styles.sectionTitle, { marginTop: 25, marginBottom: 10 }]}>Pay Later</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.row} onPress={() => handleSelect('Pay at drop')}>
              <Icon name="qrcode-scan" size={24} color="#374151" style={{ marginRight: 15 }} />
              <Text style={styles.rowText}>Pay at drop</Text>
              <Icon 
                name={selectedMethod === 'Pay at drop' ? 'radiobox-marked' : 'radiobox-blank'} 
                size={24} 
                color={selectedMethod === 'Pay at drop' ? '#1e3a8a' : '#9ca3af'} 
              />
            </TouchableOpacity>
            <View style={styles.infoBox}>
              <Icon name="tag" size={16} color="#6B7280" />
              <Text style={styles.infoBoxText}>Go cashless, after ride pay by scanning QR code</Text>
            </View>
          </View>

          {/* Others */}
          <Text style={[styles.sectionTitle, { marginTop: 25, marginBottom: 10 }]}>Others</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.row} onPress={() => handleSelect('Cash')}>
              <Icon name="cash-multiple" size={24} color="#374151" style={{ marginRight: 15 }} />
              <Text style={styles.rowText}>Cash</Text>
              <Icon 
                name={selectedMethod === 'Cash' ? 'radiobox-marked' : 'radiobox-blank'} 
                size={24} 
                color={selectedMethod === 'Cash' ? '#1e3a8a' : '#9ca3af'} 
              />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  backBtn: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textTitle },
  
  content: { padding: 20 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  fareLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textTitle },
  fareAmount: { fontSize: 22, fontWeight: '900', color: COLORS.textTitle },
  dividerDashed: { height: 1, borderColor: '#d1d5db', borderWidth: 1, borderStyle: 'dashed', marginBottom: 20 },
  
  card: { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 15, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardGroup: { backgroundColor: COLORS.cardBg, borderRadius: 12, paddingVertical: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textTitle },
  linkText: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  
  iconWrapper: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textTitle },
  sectionSubtitle: { fontSize: 15, fontWeight: '600', color: COLORS.textTitle },
  
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 15 },
  
  infoBox: { flexDirection: 'row', backgroundColor: '#f3f4f6', marginHorizontal: 15, marginBottom: 15, padding: 12, borderRadius: 8, alignItems: 'center' },
  infoBoxText: { fontSize: 12, color: COLORS.textSub, marginLeft: 8 },
});

export default PaymentSelectionModal;
