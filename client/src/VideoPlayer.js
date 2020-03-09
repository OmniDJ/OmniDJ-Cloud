import React, { useRef, useState, useEffect } from "react";
import { Janus } from "./useJanus/janus";
import { useRemoteFeed } from "./useJanus/useRemoteFeed";

export const VideoPlayer = ({
  publisher,
  connection,
  myPrivateId,
  currentRoom,
  className
}) => {
  // const id = publisher["id"];
  const [videoDimensions, setVideoDimensions] = useState({});
  const [bitRate, setBitRate] = useState(null);
  // const [bitRateTimer, setBitRateTimer] = useState(null);

  const videoRef = useRef();
  const [videoRoomAPI, remoteStream, user] = useRemoteFeed({
    videoRef: videoRef,
    publisher: publisher,
    connection: connection,
    currentRoom: currentRoom,
    myPrivateId: myPrivateId
  });

  useEffect(() => {
    console.log("remoteStream changed: ", remoteStream);
    if (!remoteStream) {
      console.log("invalid remote stream");
      return;
    }
    const videoElement = videoRef.current;
    console.log("videoELement este: ", videoElement);
    Janus.attachMediaStream(videoElement, remoteStream);
    console.log("playing remoteStream");
    videoElement.play();
  }, [remoteStream]);

  useEffect(() => {
    if (!videoRoomAPI) {
      console.log("No remote feed");
      return;
    }
    console.log("videoRoomAPI is: ", videoRoomAPI);
    // let bitRateTimer = setInterval(() => {
    //   let bitRate = videoRoomAPI.getBitrate();
    //   setBitRate(bitRate);
    //   var width = videoRef.current.videoWidth;
    //   var height = videoRef.current.videoHeight;
    //   setVideoDimensions({ width: width, height: height });
    //   // console.log("Bitrate is: ", bitRate);
    // }, 1000);
    return function cleanup() {
      console.log("Doing cleanup here - videoRoomAPI is: ", videoRoomAPI);

      // clearInterval(bitRateTimer);
      videoRoomAPI.detach();
    };
  }, [videoRoomAPI]);

  const onVideoPlaying = () => {
    console.log("Video is now playing!! - videoRoomAPI: ", videoRoomAPI);
  };

  if (user === null) {
    return null;
  }

  return (
    <>
      <div
        // key={user.id}
        className={"relative " + className}
      >
        <video
          className={className}
          style={{
            // width: "100vh",
            maxHeight: "100vh"
          }}
          // className="absolute"
          // style={{
          //   left: "50%",
          //   top: "50%",
          //   transform: "translate(-50%, -50%)"
          // }}
          ref={videoRef}
          // width="100%"
          // height="100%"
          autoPlay
          playsInline
          onPlaying={onVideoPlaying}
        ></video>
        <div className="absolute top-0 left-0 right-0 h-8 opacity-50 faded-down-50">
          <span className="absolute top-0 left-0 py-4 px-4 text-white text-lg font-medium select-none">
            {user.username}
          </span>
        </div>
        {/* // {/*  */}
        {/* <span className="absolute bottom-0 left-0 m-4">
        {videoDimensions.width}x{videoDimensions.height}
      </span>
      <span className="absolute bottom-0 right-0 m-4">{bitRate}</span> */}
      </div>
    </>
  );
};
