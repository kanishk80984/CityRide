import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import rideReducer from './rideSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ride: rideReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
