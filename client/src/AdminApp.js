import React, { useCallback, useEffect, useState } from "react";
import { useAppState } from "./context/App";
import { message, Dropdown, Button, Icon, Menu, Modal } from "antd";
const { confirm } = Modal;

// const BORDER_COLOR = "#444c67";
const BORDER_COLOR = "#2e354a";

export const useUsers = () => {
  const handleError = error => {
    console.log("Got error: ", error);
    message.error({
      content: String(error),
      key: "registerError",
      duration: 2
    });
  };
  const { backendServer, authState } = useAppState();
  const [users, setUsers] = useState([]);
  const refreshUsers = useCallback(() => {
    fetch(backendServer + "/users/list", {
      method: "GET",
      mode: "cors"
    })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          handleError(json.error);
        } else {
          setUsers(json);
        }
      })
      .catch(error => {
        handleError(error);
      });
  }, [backendServer]);

  const deleteUser = useCallback(
    username => {
      return new Promise((resolve, reject) => {
        fetch(backendServer + "/users/delete", {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authState.accessToken}`
          },
          body: JSON.stringify({
            username: username
          })
        })
          .then(response => response.json())
          .then(json => {
            if (json.error) {
              reject(json.error);
            } else {
              resolve(json);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    [backendServer]
  );

  return [users, refreshUsers, deleteUser];
};

export const AdminApp = () => {
  const [users, refreshUsers, deleteUser] = useUsers();

  useEffect(() => {
    console.log("AdminApp constructor");
    refreshUsers();
    return () => {
      console.log("AdminApp destructor");
    };
  }, []);

  const onDeleteUser = useCallback(
    username => {
      console.log("Click pe " + username);
      confirm({
        title: "Are you user you want to delete this user?",
        content: `${username}`,
        onOk() {
          deleteUser(username)
            .then(result => {
              refreshUsers();
            })
            .catch(error => {
              message.error({
                content: String(error),
                key: "deleteUserError",
                duration: 2
              });
            });
          console.log("OK");
        },
        onCancel() {
          console.log("Cancel");
        }
      });
    },
    [deleteUser, refreshUsers]
  );

  const userRender = useCallback((value, index, array) => {
    let showDivider = index !== array.length - 1;
    // console.log("userRender - value is: ", value);
    return (
      <div
        key={"user" + index}
        style={{
          borderColor: BORDER_COLOR
        }}
        className="w-full"
      >
        {/* <div>{JSON.stringify(value)}</div> */}
        <div className="flex flex-row items-baseline py-1">
          <div className="w-full grid grid-cols-5">
            <div className="col-span-1">{value.username}</div>
            <div className="col-span-1">{value.email}</div>
            <div className="col-span-1">{value.firstName}</div>
            <div className="col-span-1">{value.lastName}</div>
            <div className="col-span-1">
              <div
                style={{
                  borderColor: BORDER_COLOR,
                  backgroundColor: "#1e2948"
                }}
                className="rounded border hover:border-blue-800 transition duration-200 inline-block text-xs px-1"
              >
                {value.accountType}
              </div>
            </div>
          </div>
          <div className="w-2"></div>
          <Dropdown
            placement="bottomRight"
            key="more"
            overlay={
              <Menu>
                <Menu.Item onClick={() => onDeleteUser(value.username)}>
                  Delete account
                </Menu.Item>
              </Menu>
            }
          >
            <Button
              style={
                {
                  // borderColor: BORDER_COLOR
                }
              }
            >
              <Icon
                type="ellipsis"
                style={{
                  fontSize: 20,
                  verticalAlign: "top"
                }}
              />
            </Button>
          </Dropdown>
        </div>
        {showDivider === true && (
          <div
            style={{
              height: "1px",
              marginBottom: "-1px",
              backgroundColor: BORDER_COLOR
            }}
          ></div>
        )}
      </div>
    );
  }, []);

  return (
    <>
      <div className="text-2xl py-6">Registered users</div>
      {users.length > 0 ? (
        <>
          <div
            style={{ borderColor: BORDER_COLOR, backgroundColor: "#1e294873" }}
            className="users-table rounded-md px-2 py-1 border py"
          >
            <div className="flex flex-row items-baseline py-1">
              <div className="w-full grid grid-cols-5 select-none">
                <div className="col-span-1">Username</div>
                <div className="col-span-1">Email</div>
                <div className="col-span-1">First name</div>
                <div className="col-span-1">Last name</div>
                <div className="col-span-1">Account Type</div>
              </div>
              <div className="w-2"></div>
              <div style={{ width: "3.2rem" }}>Action</div>
            </div>
            <div
              style={{ height: "1px", backgroundColor: BORDER_COLOR }}
              className="mb-2"
            ></div>
            {users.map((value, index, array) =>
              userRender(value, index, array)
            )}
          </div>
        </>
      ) : null}
    </>
  );
};
