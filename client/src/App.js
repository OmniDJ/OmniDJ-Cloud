import React, { useState } from "react";
import { useAuth } from "./useAuth";
import { AppStateProvider } from "./context/App";
import { Home } from "./Home";

const backendServerGlobal = `${document.location.origin}/api/`;
// const backendServerGlobal = `${document.location.pathname}/api/`;

export const App = () => {
  const [authState, doLogin, doLogout] = useAuth();
  const [backendServer, setBackendServer] = useState(backendServerGlobal);
  console.log("Backend server is: " + backendServer);
  console.log("userInfo is: ", authState.userInfo);
  let isDJ =
    authState.userInfo && authState.userInfo.accountType === "dj"
      ? true
      : false;
  let isAdmin =
    authState.userInfo && authState.userInfo.accountType === "admin"
      ? true
      : false;
  const state = {
    authState,
    doLogin,
    doLogout,
    userInfo: authState.userInfo,
    isDJ: isDJ,
    isAdmin: isAdmin,
    backendServer,
    setBackendServer
  };
  return (
    <AppStateProvider state={state}>
      <Home />
    </AppStateProvider>
  );
};
