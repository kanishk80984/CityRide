import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SOCKET_URL } from '../config/env';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        if (socketRef.current) return;

        const newSocket = io(SOCKET_URL, { query: { token } });
        socketRef.current = newSocket;
        
        if (isMounted) {
          setSocket(newSocket);
        }
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
