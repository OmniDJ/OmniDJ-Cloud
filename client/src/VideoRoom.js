import React, { useCallback, useState, useEffect, useRef } from "react";
import { useAppState } from "./context/App";
import { Janus } from "./useJanus/janus";
import socketIOClient from "socket.io-client";

import { VideoPlayer } from "./VideoPlayer";
import { MicrophoneButton } from "./Microphone";

import { Button, Select, Icon, message } from "antd";
import { useJanus } from "useJanus";
import { useCamera } from "./useCamera";

import { CameraIcon } from "components/icons";
import { blobToBase64 } from "./useCamera";
import "./VideoRoom.css";

const { Option } = Select;

// const BORDER_COLOR = "#353344";
// const BORDER_COLOR = "rgba(148, 153, 169, 0.32)";
const BORDER_COLOR = "#444c67";
// const BACKGROUND_COLOR = "#1a1922b3";
const BACKGROUND_COLOR = "rgba(37, 49, 86, 0.48)";

const postFileBase64 = ({ blob, backendServer, username, userID, roomID }) => {
  blobToBase64(blob, base64 => {
    fetch(backendServer + "/send_image", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: userID,
        user_name: username,
        user_room: roomID,
        image: base64
      })
    })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          message.error(json.error);
        } else {
          console.log("postFileBase64 got json: ", json);
        }
      });
  });
};

export const VideoRoom = ({
  connection,
  onRoomJoined,
  onRoomLeft,
  roomToJoin
}) => {
  const appState = useAppState();
  const { userInfo, isDJ, backendServer } = appState;
  const [callbackSet, setCallbackSet] = useState(false);

  // const [snapshotVideoRef, startCamera, stopCamera, takeASnap] = useCamera();

  const [socket, setSocket] = useState(null);
  const [statistics, setStatistics] = useState({});
  const videosControl = useRef(null);

  const [
    isPluginAttached,
    userCallbacks,
    participants,
    publishersList,
    currentRoom,
    isRoomJoined,
    user,
    joinRoom,
    leaveRoom,
    localStream,
    isPublishingVideo,
    publishOwnFeed,
    unpublishOwnFeed,
    toggleMute,
    isAudioMuted,
    bitrate,
    setBitrate
  ] = useJanus({ connection });

  const localVideoRef = useCallback(
    node => {
      if (node) {
        Janus.attachMediaStream(node, localStream);
        console.log("Playing local stream");
        node.play();
      }
    },
    [localStream]
  );

  useEffect(() => {
    console.log("Participants changed: ", participants);
  }, [participants]);

  useEffect(() => {
    console.log("VideoRoom constructor");
    if (isDJ === false) {
      // For snapshot
      // startCamera();
    }
    let socketAddress = `${document.location.origin}`;
    // Only subscribe to socket events if we this is a DJ
    if (isDJ === true) {
      const newSocket = socketIOClient(socketAddress);
      setSocket(newSocket);
      console.log("Socket for: ", socketAddress, " -> ", newSocket);
    }

    return () => {
      console.log("VideoRoom destructor");
      if (isPublishingVideo === true) {
        unpublishOwnFeed();
      }
    };
  }, []);

  const updateStatistics = useCallback(data => {
    // console.log("Received user image: ", data);
    let user_id = data["user_id"];
    let user_name = data["user_name"];
    let image = data["image"];
    let newStatistics = { ...statistics };
    newStatistics[user_id] = { name: user_name, image: image };
    // console.log("newStatistics: ", newStatistics);
    setStatistics(newStatistics);
  }, []);

  useEffect(() => {
    // console.log("Socket changed: ", socket);
    if (!socket) {
      return;
    }
    // console.log("Valid socket now");
    if (callbackSet === false) {
      socket.on("got_user_image", updateStatistics);
      setCallbackSet(true);
    }
  }, [socket]);

  const onParticipantJoined = useCallback(participant => {
    console.log("Participant joined: ", participant);
  }, []);

  const onParticipantLeft = useCallback(
    participant => {
      console.log("Participant left: ", participant);
      // console.log("current statistics: ", statistics);
      let newStatistics = { ...statistics };
      delete newStatistics[participant.id];
      // console.log("newStatistics: ", newStatistics);
      //   newStatistics[participant.name] = null;
      setStatistics(newStatistics);
    },
    [statistics]
  );

  useEffect(() => {
    console.log("isPluginAttached changed to: ", isPluginAttached);
    if (isPluginAttached === true) {
      userCallbacks.onParticipantJoined = onParticipantJoined;
      userCallbacks.onParticipantLeft = onParticipantLeft;
      let userID;
      joinRoom(roomToJoin, appState.userInfo.username, userID);
    }
  }, [isPluginAttached]);

  useEffect(() => {
    // console.log("onParticipantLeft changed");
    userCallbacks.onParticipantLeft = onParticipantLeft;
  }, [onParticipantLeft]);

  useEffect(() => {
    // console.log("onParticipantJoined changed");
    userCallbacks.onParticipantJoined = onParticipantJoined;
  }, [onParticipantJoined]);

  useEffect(() => {
    console.log("isRoomJoined changed to: ", isRoomJoined);
    let username = userInfo.username;

    if (isRoomJoined === true) {
      //   console.log("Sending socket message for: ", username);
      //   console.log("currentRoom: ", currentRoom);
      //   debugger;
      onRoomJoined &&
        onRoomJoined({
          user_id: currentRoom.userID,
          user_name: username,
          user_room: currentRoom.id,
          image_send_url: backendServer + "send_image"
        });
      if (socket !== null) {
        console.log("Facem emit - join");
        socket.emit("message", {
          action: "join",
          room: currentRoom.id,
          user_id: currentRoom.userID,
          user_name: username
        });
      }
    } else if (currentRoom !== null) {
      onRoomLeft &&
        onRoomLeft({
          user_id: currentRoom.userID,
          user_name: username,
          user_room: currentRoom.id,
          image_send_url: backendServer + "send_image"
        });
      if (socket !== null) {
        console.log("Facem emit - leave");
        socket.emit("message", {
          action: "leave",
          room: currentRoom.id,
          user_id: currentRoom.userID,
          user_name: username
        });
      }
    }
  }, [isRoomJoined]);

  useEffect(() => {
    console.log("localStream changed: ", localStream);
    if (localStream !== null) {
      let myVideoHtmlElement = localVideoRef.current;
      console.log("My video html element is: ", myVideoHtmlElement);
      Janus.attachMediaStream(myVideoHtmlElement, localStream);
    }
  }, [localStream, localVideoRef]);

  const goFullScreen = useCallback(() => {
    let elem = videosControl.current;
    // if (elem != null) {
    //   if (elem.requestFullscreen) {
    //     elem.requestFullscreen();
    //   } else if (elem.mozRequestFullScreen) {
    //     /* Firefox */
    //     elem.mozRequestFullScreen();
    //   } else if (elem.webkitRequestFullscreen) {
    //     /* Chrome, Safari and Opera */
    //     elem.webkitRequestFullscreen();
    //   } else if (elem.msRequestFullscreen) {
    //     /* IE/Edge */
    //     elem.msRequestFullscreen();
    //   }
    // }

    var isInFullScreen =
      (document.fullscreenElement && document.fullscreenElement !== null) ||
      (document.webkitFullscreenElement &&
        document.webkitFullscreenElement !== null) ||
      (document.mozFullScreenElement &&
        document.mozFullScreenElement !== null) ||
      (document.msFullscreenElement && document.msFullscreenElement !== null);

    if (!isInFullScreen) {
      if (elem != null) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullScreen) {
          elem.webkitRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, []);

  const leaveTheRoom = useCallback(() => {
    leaveRoom()
      .then(() => {
        console.log("leaveRoom -> entered");
        // console.log("Facem emit - leave");
        // if (socket !== null) {
        //   socket.emit("message", {
        //     action: "leave",
        //     room: currentRoom.id,
        //     user_id: currentRoom.userID,
        //     user_name: userInfo.username
        //   });
        // }
      })
      .catch(error => {
        console.log("Error on leave: ", error);
      });
  }, [leaveRoom, socket, currentRoom]);

  const onBitrateChanged = value => {
    console.log("Bitrate changed: ", value);
    setBitrate(value);
  };
  const onPublishUnpublishClick = useCallback(() => {
    if (isPublishingVideo === true) {
      unpublishOwnFeed();
    } else {
      publishOwnFeed(true);
    }
  }, [isPublishingVideo, publishOwnFeed, unpublishOwnFeed]);

  const nobodyStreaming =
    isPublishingVideo === false && publishersList.length === 0;

  let numVideos = publishersList.length;
  if (isPublishingVideo === true) {
    numVideos += 1;
  }

  let localVideoClassName = numVideos <= 2 ? "w-full" : "";

  let videosContainerClassName = "";
  switch (numVideos) {
    case 1:
      videosContainerClassName = "grid-cols-1 grid-rows-1";
      break;
    case 2:
      videosContainerClassName = "grid-cols-2 grid-rows-1";
      break;
    case 3:
    case 4:
      videosContainerClassName = "grid-cols-2 grid-rows-2";
      break;
    default:
      videosContainerClassName = "grid-cols-3 grid-rows-2";
  }

  console.log("localVideoClassName: ", localVideoClassName);

  const header = () => (
    <div className="flex flex-row items-baseline select-none">
      {/* <div className="w-4 h-4 cursor-pointer" onClick={joinUnjoinRoom}>
              <ChevronRightIcon />
            </div> */}
      <div>
        <CameraIcon className="w-4 h-4 mr-4"></CameraIcon>
      </div>
      <div className="font-semibold text-lg text-gray-400">
        {currentRoom.description}
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <>
      <div
        className="h-full text-center p-6 " //border border-r-0  rounded-l-lg"
        style={{ backgroundColor: BACKGROUND_COLOR, borderColor: BORDER_COLOR }}
      >
        {isDJ === true ? (
          <>
            <p className="p-6 text-lg">
              Looks like nobody is streaming in this virtual scene.<br></br>{" "}
              Would you like to be the first one?
            </p>
            <Button type="primary" onClick={onPublishUnpublishClick}>
              {isPublishingVideo ? "Stop Streaming" : "Start Streaming"}
            </Button>
          </>
        ) : (
          <p className="p-6 text-lg">
            No DJ streaming in this virtual scene. Waiting for a DJ to start
            streaming.
          </p>
        )}
      </div>
    </>
  );

  // const onTakeSnapshot = useCallback(() => {
  //   takeASnap().then(blob =>
  //     postFileBase64({
  //       blob,
  //       backendServer,
  //       username: userInfo.username,
  //       userID: currentRoom.userID,
  //       roomID: currentRoom.id
  //     })
  //   );
  // }, [takeASnap]);

  if (isRoomJoined === null || isRoomJoined === false) {
    // if (currentRoom !== null) {
    //   stopCamera();
    // }
    console.log("Room not joined. Not rendering anything");
    return null;
  }

  // console.log("participants: ", participants);
  // console.log("statistics: ", statistics);

  const streamingContent = () =>
    nobodyStreaming === true ? (
      renderEmptyState()
    ) : (
      <div
        // className="flex flex-wrap overflow-auto bg-black relative"
        className={
          "videos-list overflow-auto bg-black relative " +
          videosContainerClassName
        }
        ref={videosControl}
      >
        {isPublishingVideo === true && (
          <div
            key={user.id}
            className={
              "local-video " +
              localVideoClassName +
              " flex items-center justify-center"
            }
          >
            <div className={"relative " + localVideoClassName}>
              <video
                className={localVideoClassName}
                style={{
                  maxHeight: "100vh"
                }}
                ref={localVideoRef}
                // width="100%"
                // height="100%"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute top-0 left-0 right-0 h-8 opacity-75 faded-down-50">
                <div className="absolute top-0 left-0 py-4 px-4">
                  <span className="text-white text-lg font-medium select-none mr-4">
                    {appState.userInfo.username}
                  </span>
                  <Select
                    defaultValue="0"
                    value={bitrate}
                    onChange={onBitrateChanged}
                    className="w-32"
                  >
                    <Option value={0}>Full Quality</Option>
                    <Option value={128}>Cap to 128kbit</Option>
                    <Option value={256}>Cap to 256kbit</Option>
                    <Option value={512}>Cap to 512kbit</Option>
                    <Option value={1024}>Cap to 1mbit</Option>
                    <Option value={1500}>Cap to 1.5mbit</Option>
                    <Option value={2000}>Cap to 2mbit</Option>
                  </Select>
                </div>
                <MicrophoneButton
                  className="absolute top-0 right-0 cursor-pointer text-2xl py-2 px-6 text-white"
                  toggle={toggleMute}
                  muted={isAudioMuted}
                />
              </div>
            </div>
          </div>
        )}
        {publishersList.map((publisher, i) => {
          let videoClassName =
            "publisher-video flex items-center justify-center relative";
          // publishersList.length === 1 && isPublishingVideo === false
          //   ? "w-full"
          //   : "w-1/2";
          return (
            <div key={publisher.id} className={videoClassName}>
              <VideoPlayer
                publisher={publisher}
                connection={connection}
                myPrivateId={user.private_id}
                currentRoom={currentRoom.id}
                className={numVideos <= 2 ? "w-full" : ""}
              ></VideoPlayer>
            </div>
          );
        })}
        <div className="absolute right-0 top-0">
          <Button onClick={goFullScreen}>Full screen</Button>
        </div>
      </div>
    );

  return (
    <>
      {/* <video className="hidden" ref={snapshotVideoRef} muted></video> */}

      <div className="flex flex-row justify-between items-baseline py-4">
        {header()}
        <div className="flex flex-row">
          {/* {isDJ === false && (
            <>
              <Button onClick={onTakeSnapshot}>Take snapshot</Button>
              <div className="w-2" />
            </>
          )} */}
          <Button onClick={leaveTheRoom}>Leave virtual scene</Button>

          {appState.isDJ === true && nobodyStreaming === false && (
            <>
              <div className="w-2" />
              <Button type="primary" onClick={onPublishUnpublishClick}>
                {isPublishingVideo ? "Stop Streaming" : "Start Streaming"}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex-auto">
        {Object.keys(statistics).length !== 0 && (
          <div className="font-semibold text-lg">Viewers</div>
        )}
        <div className="flex flex-wrap rounded overflow-auto">
          {Object.keys(statistics).map((value, index) => {
            let imageString = statistics[value].image;
            let username = statistics[value].name;
            return (
              <div key={value} className="w-1/2 p-2">
                <div
                  className="-mx-2 flex flex-col border shadow-md rounded overflow-hidden"
                  style={{
                    borderColor: BORDER_COLOR,
                    backgroundColor: BACKGROUND_COLOR
                  }}
                >
                  <img
                    alt={value}
                    src={"data:image/png;base64," + imageString}
                  />
                  <div className="font-semibold p-4">{username}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-row">
          <div
            className="w-4/5 rounded-l border border-r-0"
            style={{ borderColor: BORDER_COLOR }}
          >
            {streamingContent()}
          </div>
          <div
            className="w-1/5 flex-initial flex-col rounded-r border"
            style={{
              borderColor: BORDER_COLOR,
              backgroundColor: BACKGROUND_COLOR
            }}
          >
            {Object.keys(participants).map((value, index, array) => {
              let showDivider = index !== array.length - 1;
              return (
                <div
                  key={value}
                  className="select-none truncate p-2 flex-row"
                  // style={{ width: "8rem" }}
                >
                  <div className="flex flex-row items-baseline pb-2">
                    <Icon
                      type="user"
                      className="mr-1"
                      style={{ verticalAlign: "0" }}
                    />
                    <div className="truncate" title={participants[value].name}>
                      {" "}
                      {participants[value].name}
                    </div>
                  </div>
                  {showDivider === true && (
                    <div
                      style={{
                        height: "1px",
                        marginBottom: "-1px",
                        backgroundColor: "#4b4860"
                      }}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
