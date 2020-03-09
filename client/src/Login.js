import React, { useState, useRef, useEffect } from "react";
import { useAppState } from "./context/App";
import { message, Button, Input, Row, Col, Typography, Modal } from "antd";

import { RegisterModal } from "./Register";

const { Text } = Typography;

const enterUsernameKey = "enterusername";
const loginErrorKey = "loginerror";

const LogoImage = require("./images/logo.png");

export const Login = ({ onLogin, onLoginError }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const appState = useAppState();
  let { backendServer } = appState;

  const loginUserRef = useRef();
  const loginPassRef = useRef();

  const handleError = json => {
    console.log("Got error: ", json);
    message.error({
      content: json.error,
      key: loginErrorKey,
      duration: 2
    });
    onLoginError && onLoginError(json);
  };

  useEffect(() => {
    loginUserRef.current.focus();
  }, []);

  const onLoginClick = e => {
    e.preventDefault();
    if (username === "") {
      message.error("Please enter a username");
      return;
    }
    if (password === "") {
      message.error("Please enter a password");
      return;
    }
    fetch(backendServer + "/users/login", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    })
      .then(response => {
        console.log("response is: ", response);
        if (response.ok === false) {
          if (response.statusText === "UNAUTHORIZED") {
            message.error("Please check username and password and try again");
          } else
            Modal.error({
              title: "Could not login",
              content: "Server said: " + response.statusText
            });
          throw new Error("Could not login");
        }
        return response.json();
      })
      .then(json => {
        if (json.error) {
          handleError(json);
        } else {
          const accessToken = json.access_token;
          onLogin(accessToken);
        }
      })
      .catch(error => {
        console.log("Error on json: ", error);
      })
      .catch(error => {
        console.log("Error on login: ", error);
      });
  };

  const onUsernameEnter = () => {
    console.log("onUsernameEnter");
    if (username === "") {
      message.error({
        content: "Please enter a username",
        key: enterUsernameKey,
        duration: 2
      });
      loginUserRef.current.focus();
    } else {
      loginPassRef.current.focus();
    }
  };

  const onRegisterClick = () => {
    setRegisterModalVisible(true);
  };

  const onRegisterSuccess = params => {
    console.log("onRegisterSuccess - params: ", params);
    setUsername(params.username);
    setPassword(params.password);
  };

  return (
    <Col>
      <Row type="flex" justify="center" align="middle" className="py-4">
        {/* <Title level={2}>OmniDJ</Title> */}
        <div
          className="w-20 h-5 bg-contain bg-no-repeat bg-center"
          style={{ backgroundImage: `url(${LogoImage})` }}
        ></div>
      </Row>
      <Row type="flex" justify="center" align="middle">
        <form>
          <div className="py-2">
            <Text strong>Username</Text>
            <div className="mt-2">
              <Input
                ref={loginUserRef}
                placeholder="Enter a username"
                type="text"
                name="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onPressEnter={onUsernameEnter}
              />
            </div>
          </div>
          <div className="py-2">
            <Text strong>Password</Text>
            <div className="mt-2">
              <Input.Password
                placeholder="Enter a password"
                ref={loginPassRef}
                // type="password"
                // name="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onPressEnter={onLoginClick}
              />
            </div>
          </div>
          <div className="py-2">
            Don't have an account?{" "}
            <span
              onClick={onRegisterClick}
              className="text-blue-200 cursor-pointer select-none"
            >
              Create one
            </span>
          </div>
        </form>
      </Row>
      <Row type="flex" justify="center" align="middle">
        <div className="py-5">
          <Button onClick={onLoginClick}>Login</Button>
        </div>
      </Row>
      <RegisterModal
        visibility={[registerModalVisible, setRegisterModalVisible]}
        onRegisterSuccess={onRegisterSuccess}
      />
    </Col>
  );
};
