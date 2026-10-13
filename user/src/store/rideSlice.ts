import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RideState {
  pickupLocation: { latitude: number; longitude: number; address: string; isManual?: boolean } | null;
  dropLocation: { latitude: number; longitude: number; address: string; isManual?: boolean } | null;
  selectedVehicleType: number | null;
  selectedRideType: number | null;
  estimatedFare: any | null;
  isMapSelectionMode: boolean;
  mapSelectionIsPickup: boolean;
  isParcel: boolean;
  parcelDetails: {
    recipientName: string;
    recipientPhone: string;
    parcelDescription: string;
  } | null;
  tripType: 'ONE_WAY' | 'TWO_WAY';
  mapTheme: 'light' | 'dark';
}

const initialState: RideState = {
  pickupLocation: null,
  dropLocation: null,
  selectedVehicleType: null,
  selectedRideType: null,
  estimatedFare: null,
  isMapSelectionMode: false,
  mapSelectionIsPickup: false,
  isParcel: false,
  parcelDetails: null,
  tripType: 'ONE_WAY',
  mapTheme: 'light',
};

const rideSlice = createSlice({
  name: 'ride',
  initialState,
  reducers: {
    setPickupLocation: (state, action: PayloadAction<any>) => {
      state.pickupLocation = action.payload;
    },
    setDropLocation: (state, action: PayloadAction<any>) => {
      state.dropLocation = action.payload;
    },
    setSelectedVehicle: (state, action: PayloadAction<number>) => {
      state.selectedVehicleType = action.payload;
    },
    setSelectedRideType: (state, action: PayloadAction<number>) => {
      state.selectedRideType = action.payload;
    },
    setEstimatedFare: (state, action: PayloadAction<any>) => {
      state.estimatedFare = action.payload;
    },
    setMapSelectionMode: (state, action: PayloadAction<{ isActive: boolean, isPickup?: boolean }>) => {
      state.isMapSelectionMode = action.payload.isActive;
      if (action.payload.isPickup !== undefined) {
        state.mapSelectionIsPickup = action.payload.isPickup;
      }
    },
    setIsParcel: (state, action: PayloadAction<boolean>) => {
      state.isParcel = action.payload;
    },
    setParcelDetails: (state, action: PayloadAction<any>) => {
      state.parcelDetails = action.payload;
    },
    setTripType: (state, action: PayloadAction<'ONE_WAY' | 'TWO_WAY'>) => {
      state.tripType = action.payload;
    },
    setMapTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.mapTheme = action.payload;
    },
    resetRide: (state) => {
      return initialState;
    }
  },
});

export const { setPickupLocation, setDropLocation, setSelectedVehicle, setSelectedRideType, setEstimatedFare, setMapSelectionMode, setIsParcel, setParcelDetails, setTripType, setMapTheme, resetRide } = rideSlice.actions;
export default rideSlice.reducer;
