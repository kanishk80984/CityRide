import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ParcelBookingSheetProps {
  pickupLocation: any;
  dropLocation: any;
  fareAmount: number;
  onEditPickup: () => void;
  onEditDrop: () => void;
  onPlaceOrder: (details: { recipientName: string, recipientPhone: string, parcelDescription: string }) => void;
  onBack: () => void;
  booking: boolean;
}

const COLORS = {
  primary: '#11704B',
  bg: '#fff',
  textTitle: '#374151',
  textSub: '#6B7280',
  border: '#E5E7EB',
  buttonYellow: '#facc15',
  error: '#EF4444'
};

const ParcelBookingSheet: React.FC<ParcelBookingSheetProps> = ({
  pickupLocation,
  dropLocation,
  fareAmount,
  onEditPickup,
  onEditDrop,
  onPlaceOrder,
  onBack,
  booking
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [parcelDescription, setParcelDescription] = useState('');
  const [errors, setErrors] = useState<{name?: string, phone?: string}>({});

  const validate = () => {
    let valid = true;
    let newErrors: {name?: string, phone?: string} = {};

    if (!recipientName.trim()) {
      newErrors.name = 'Recipient name is required';
      valid = false;
    }
    if (!recipientPhone.trim() || recipientPhone.length < 10) {
      newErrors.phone = 'Valid 10-digit phone number is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handlePlaceOrder = () => {
    if (validate()) {
      onPlaceOrder({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        parcelDescription: parcelDescription.trim()
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} disabled={booking}>
          <Icon name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Parcel Delivery</Text>
          <Text style={styles.headerSubtitle}>Send your parcel safely</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Pickup Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup From</Text>
          <TouchableOpacity style={styles.locationBox} onPress={onEditPickup}>
            <View style={styles.locationIconWrap}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {pickupLocation?.address || 'Select Pickup Location'}
              </Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Drop / Recipient Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliver To</Text>
          <TouchableOpacity style={styles.locationBox} onPress={onEditDrop}>
            <View style={styles.locationIconWrap}>
              <View style={[styles.dot, { backgroundColor: '#dc2626' }]} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {dropLocation?.address || 'Select Drop Location'}
              </Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Recipient Name"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholderTextColor="#9ca3af"
              editable={!booking}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.inputContainer}>
            <Icon name="phone-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Recipient Phone Number"
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor="#9ca3af"
              editable={!booking}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        {/* Parcel Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parcel Details</Text>
          <View style={styles.inputContainer}>
            <Icon name="package-variant" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Eg: Documents, clothes, food..."
              value={parcelDescription}
              onChangeText={setParcelDescription}
              placeholderTextColor="#9ca3af"
              editable={!booking}
            />
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareAmount}>₹{fareAmount}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.finalBookBtn, booking && { backgroundColor: '#E5E7EB' }]}
          disabled={booking}
          onPress={handlePlaceOrder}
        >
          {booking ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#666" style={{ marginRight: 10 }} />
              <Text style={[styles.bookBtnText, { color: '#666' }]}>Placing Order...</Text>
            </View>
          ) : (
            <Text style={styles.bookBtnText}>Place Parcel Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 8,
    marginRight: 10,
    marginLeft: -8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  locationIconWrap: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  locationAddress: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  changeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginBottom: 8,
    marginLeft: 4,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
    backgroundColor: '#F7F8FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  fareLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  fareAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#11704B',
  },
  finalBookBtn: {
    backgroundColor: COLORS.buttonYellow,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ParcelBookingSheet;
