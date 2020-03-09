import React, { useEffect, useState, useCallback } from "react";
import { useAppState } from "./context/App";
import { Button, Dropdown, Icon, Menu } from "antd";
import { kickFromRoomAPI } from "useJanus/api";

import { VideoRoom } from "./VideoRoom";

import { useJanusSession } from "./useJanus/useJanusSession";

import { CreateRoomModal } from "CreateRoom";

const RoomImage = require("./images/room.png");

// const BORDER_COLOR = "#353344";
// const BORDER_COLOR = "#283350";
const ROOM_BORDER_COLOR = "rgba(148, 153, 169, 0.32)";
// const ROOM_BACKGROUND_COLOR = "#1a1922b3";
const ROOM_BACKGROUND_COLOR = "rgba(37, 49, 86, 0.48)";

var server = "https://lummetry.appsvoice.com/janus";

export const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path
      fill="currentColor"
      d="M504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zm-448 0c0-110.5 89.5-200 200-200s200 89.5 200 200-89.5 200-200 200S56 366.5 56 256zm189.1 129.9L123.7 264.5c-4.7-4.7-4.7-12.3 0-17l121.4-121.4c4.7-4.7 12.3-4.7 17 0l19.6 19.6c4.8 4.8 4.7 12.5-.2 17.2L211.2 230H372c6.6 0 12 5.4 12 12v28c0 6.6-5.4 12-12 12H211.2l70.3 67.1c4.9 4.7 5 12.4.2 17.2l-19.6 19.6c-4.7 4.7-12.3 4.7-17 0z"
    />
  </svg>
);

export const ChevronRight2Icon = () => (
  <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.295 11.293l6-6a.996.996 0 111.41 1.41l-5.29 5.3 5.29 5.29c.39.39.39 1.02 0 1.41-.19.2-.44.3-.7.3-.26 0-.51-.1-.71-.29l-6-6c-.39-.39-.39-1.03 0-1.42z"
      fill="currentColor"
    />
  </svg>
);

export const DJApp = () => {
  console.log("DJApp render");
  const appState = useAppState();

  const { userInfo, isDJ } = appState;

  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);

  const [roomToJoin, setRoomToJoin] = useState(null);

  const [
    connection,
    createRoom,
    destroyRoom,
    listRooms,
    refreshRooms,
    roomsList,
    listParticipants,
    kickFromRoom
  ] = useJanusSession({
    server
  });

  console.log("connection is: ", connection);

  const cleanupUser = useCallback(() => {
    let currentRoomIdString = window.localStorage["currentRoomId"];
    console.log("currentRoomIdString is: ", currentRoomIdString);
    let currentUserIdString = window.localStorage["currentUserId"];
    console.log("currentUserIdString is: ", currentRoomIdString);
    let userID;
    if (currentUserIdString) userID = Number(currentUserIdString);
    let roomID;
    if (currentRoomIdString) roomID = Number(currentRoomIdString);

    console.log("UserID is: ", userID);
    console.log("RoomID is: ", roomID);
    console.log("connection is: ", connection);
    if (userID && roomID) {
      console.log(`Kicking user ${userID} from room ${roomID}`);
      kickFromRoomAPI(connection.api, roomID, userID);
      window.localStorage.removeItem("currentRoomId");
      window.localStorage.removeItem("currentUserId");
    }
  }, [connection]);

  // useEffect(() => {
  //   console.log(
  //     "cleanupUser changed:",
  //     cleanupUser,
  //     " -> connection is: ",
  //     connection
  //   );
  // }, [cleanupUser]);

  useEffect(() => {
    console.log("useEffect pentru connection: ", connection);
    if (connection === null) {
      return;
    }
    if (connection.api === null) {
      return;
    }
    console.log("We have api");
    console.log("Will now refresh rooms:");
    refreshRooms();
  }, [connection]);

  useEffect(() => {
    console.log("roomToJoin changed to: ", roomToJoin);
  }, [roomToJoin]);

  const onCreateRoomClick = () => {
    setCreateRoomModalVisible(true);
  };

  const onRoomJoined = useCallback(
    params => {
      console.log("We have joined the room: ", params);
      console.log(
        `User id is ${params.user_id} and room id is ${params.user_room}`
      );

      cleanupUser();

      window.localStorage.setItem("currentRoomId", params.user_room);
      window.localStorage.setItem("currentUserId", params.user_id);

      let paramsToSend = { ...params };
      paramsToSend.event = "joined_room";
      console.log("isDJ: ", isDJ);
      if (isDJ === false) {
        fetch("http://127.0.0.1:5500/config", {
          method: "POST",
          // mode: "cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(paramsToSend)
        })
          .then(response => response.json())
          .then(json => {
            console.log("Jetson config got json: ", json);
          })
          .catch(error => {
            console.log("Got error: ", error);
          });
      }
    },
    [cleanupUser, isDJ]
  );

  const onRoomLeft = useCallback(params => {
    console.log("We have left the room: ", params);
    console.log(`User id is ${params.user_id}`);
    window.localStorage.removeItem("currentUserId");
    window.localStorage.removeItem("currentRoomId");
    let paramsToSend = { ...params };
    paramsToSend.event = "left_room";
    console.log("isDJ: ", isDJ);
    if (isDJ === false) {
      fetch("http://127.0.0.1:5500/config", {
        method: "POST",
        // mode: "cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(paramsToSend)
      })
        .then(response => response.json())
        .then(json => {
          console.log("Jetson config got json: ", json);
        })
        .catch(error => {
          console.log("Got error: ", error);
        });
    }

    setRoomToJoin(null);
  }, []);

  const renderEmptyState = () => (
    <div className="text-center">
      <div className="text-2xl p-6">Hi {userInfo.username}</div>
      <Icon type="smile" className="text-xl" />

      {isDJ === true ? (
        <>
          <p className="p-6 text-lg">Create a virtual scene to get started</p>
          <Button onClick={onCreateRoomClick}>Create virtual scene</Button>
        </>
      ) : (
        <p className="p-6 text-lg">
          No DJ rooms available at this moment. Waiting for a room to be created
        </p>
      )}
    </div>
  );

  const renderRoomItem = (item, index) => {
    // let showDivider = index !== roomsList.length - 1;
    return (
      <div
        key={item.room}
        className="xs:w-full w-1/3 flex-col p-2"
        style={{ minWidth: "20rem" }}
      >
        <div
          style={{
            borderColor: ROOM_BORDER_COLOR,
            backgroundColor: ROOM_BACKGROUND_COLOR
          }}
          className="border border-transparent hover:border-purple-600 hover:bg-purple-800 rounded flex flex-col cursor-pointer p-4"
          onClick={() => setRoomToJoin(item.room)}
        >
          <div className="flex flex-col">
            {/* <div>
              <CameraIcon className="w-4 h-4 mr-4"></CameraIcon>
            </div> */}
            <div
              className="w-full h-40 bg-center bg-cover bg-no-repeat rounded"
              style={{ backgroundImage: `url(${RoomImage})` }}
            ></div>
            {/* <Tooltip
              placement="bottomLeft"
              title={"Click to join " + item.description}
            > */}
            <div
              className="font-semibold text-lg mx-auto py-2 text-gray-500"

              // joinRoom(item.room, userInfo.username)}
            >
              {item.description}
            </div>
            {/* </Tooltip> */}
          </div>
          <div className="flex flex-row items-baseline mx-auto py-2">
            <Button key="join" onClick={() => setRoomToJoin(item.room)}>
              Join
            </Button>
            <div className="w-2"></div>
            {isDJ === true && (
              <Dropdown
                placement="bottomRight"
                key="more"
                overlay={
                  <Menu>
                    <Menu.Item
                      onClick={e => {
                        console.log("E is: ", e);
                        destroyRoom(item.room).then(result => {
                          refreshRooms();
                        });
                      }}
                    >
                      Delete virtual scene
                    </Menu.Item>
                  </Menu>
                }
              >
                <Button>
                  <Icon
                    type="ellipsis"
                    style={{
                      fontSize: 20,
                      verticalAlign: "top"
                    }}
                  />
                </Button>
              </Dropdown>
            )}
          </div>
        </div>
        {/* {showDivider === true && (
          <div
            style={{
              height: "1px",
              marginBottom: "-1px",
              backgroundColor: "#353344"
            }}
          ></div>
        )} */}
      </div>
    );
  };

  if (!connection) {
    return null;
  }

  return (
    <>
      {
        <>
          {roomToJoin == null ? (
            <>
              {roomsList.length > 0 ? (
                <>
                  <div className="flex flex-row justify-between py-6">
                    <div className="text-2xl">Hi {userInfo.username}</div>
                    {isDJ === true && (
                      <Button onClick={onCreateRoomClick}>
                        Create virtual scene
                      </Button>
                    )}
                  </div>
                  <div className="text-sm pb-4 ">
                    {isDJ === true
                      ? "Pick a virtual scene from the ones below or create your own virtual scene"
                      : "Click a virtual scene to join it"}
                  </div>
                  <div
                    // style={{ marginLeft: "-1px", marginRight: "-1px" }}
                    // style={{
                    //   borderColor: "#353344",
                    //   backgroundColor: "#1a1922b3"
                    // }}
                    className="videos-container -ml-2 rounded flex flex-row flex-wrap"
                  >
                    {roomsList.map((value, index) =>
                      renderRoomItem(value, index)
                    )}
                  </div>
                </>
              ) : (
                renderEmptyState()
              )}
            </>
          ) : (
            <VideoRoom
              connection={connection}
              onRoomJoined={onRoomJoined}
              onRoomLeft={onRoomLeft}
              roomToJoin={roomToJoin}
            />
          )}
          <CreateRoomModal
            visibility={[createRoomModalVisible, setCreateRoomModalVisible]}
            createRoom={createRoom}
            onSuccess={() => {
              refreshRooms();
            }}
          />
        </>
      }
    </>
  );
};
