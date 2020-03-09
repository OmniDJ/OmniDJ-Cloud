import React, { createContext, useContext } from "react";
export const AppStateContext = createContext();
export const AppStateProvider = ({ state, children }) => (
  <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>
);
export const useAppState = () => useContext(AppStateContext);
