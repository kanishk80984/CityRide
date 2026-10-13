import React, { createContext, useContext } from 'react';

const SsrDataContext = createContext(null);

export const SsrDataProvider = ({ children, initialData }) => {
  return (
    <SsrDataContext.Provider value={initialData}>
      {children}
    </SsrDataContext.Provider>
  );
};

export const useSsrData = () => {
  return useContext(SsrDataContext);
};
