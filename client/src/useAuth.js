import { useState } from "react";

const getClaims = accessToken => {
  if (!accessToken || accessToken === "undefined") return {};
  const base64Url = accessToken.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(window.atob(base64));
};

export const useAuth = () => {
  const getUserInfo = () => {
    console.log("Se apeleaza getUserInfo");
    let loggedInUser = JSON.parse(window.localStorage.getItem("loggedInUser"));
    let accessToken = loggedInUser ? loggedInUser.accessToken : null;

    let claims = accessToken ? getClaims(accessToken) : null;
    let userInfo = claims ? claims.user_claims : null;
    console.log("userInfo este: ", userInfo);
    return {
      accessToken,
      claims,
      userInfo
    };
  };
  const [authState, setAuthState] = useState(() => getUserInfo());
  console.log("useAuth called");

  // useEffect(() => {
  //   console.log("Se apeleaza useEffect");
  //   // You can use this everywhere in the app to get the accessToken
  //   let loggedInUser = JSON.parse(window.localStorage.getItem("loggedInUser"));
  //   let accessToken = loggedInUser ? loggedInUser.accessToken : null;

  //   let claims = accessToken ? getClaims(accessToken) : null;
  //   let userInfo = claims ? claims.user_claims : null;
  //   console.log("userInfo este: ", userInfo);
  //   setUserInfo(userInfo);
  //   setState({
  //     accessToken,
  //     claims,
  //     userInfo
  //   });
  // }, []);

  const doLogin = accessToken => {
    console.log("doLogin");
    let claims = getClaims(accessToken);
    let userInfo = claims.user_claims;
    setAuthState({
      accessToken,
      claims: getClaims(accessToken),
      userInfo
    });
    let loggedInUser = {
      accessToken
    };
    window.localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
  };

  const doLogout = () => {
    console.log("doLogout");
    setAuthState({
      accessToken: null,
      claims: null,
      userInfo: null
    });
    window.localStorage.removeItem("loggedInUser");
  };

  console.log("Intoarcem authState: ", authState);
  return [authState, doLogin, doLogout];
};
