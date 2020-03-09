import { useState, useCallback, useEffect, useRef } from "react";
import { Janus } from "./janus";
import {
  joinRoomAPI,
  leaveRoomAPI,
  publishOwnFeedAPI,
  unpublishOwnFeedAPI,
  attachToPlugin,
  listParticipantsAPI
} from "./api";

// JSEP -> Javascript Session Establishment Protocol
// SDP -> Session Description Protocol.

export const useJanus = ({ connection }) => {
  // console.log("useJanus called");

  // const [myPrivateId, setMyPrivateId] = useState(null);
  const [user, setUser] = useState(null);
  const [videoRoomAPI, setVideoRoomAPI] = useState(null);
  const [isRoomJoined, setIsRoomJoined] = useState(null);
  const [leaveRequestInProgress, setLeaveRequestInProgress] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [bitrate, setBitrate] = useState(0);
  const [publishersList, setPublishersList] = useState([]);
  const [isPublishingVideo, setIsPublishingVideo] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isPluginAttached, setIsPluginAttached] = useState(false);
  const [participants, setParticipants] = useState({});
  const [userCallbacks, setUserCallbacks] = useState({
    onParticipantJoined: () => {},
    onParticipantLeft: () => {}
  });

  const doAttachToPlugin = useCallback(pluginCallbacks => {
    attachToPlugin({
      opaqueId: connection.opaqueId,
      session: connection.session,
      callbacks: pluginCallbacks
    })
      .then(pluginHandle => {
        console.log("onPluginAttached: ", pluginHandle);
        setVideoRoomAPI(pluginHandle);
        setIsPluginAttached(true);
      })
      .catch(error => {
        console.log("Error attaching plugin: ", error);
      });
  }, []);

  useEffect(
    () =>
      console.log("leaveRequestInProgress changed: ", leaveRequestInProgress),
    [leaveRequestInProgress]
  );

  // useEffect(() => {
  //   console.log("videoRoomAPI changed: ", videoRoomAPI);
  //   if (videoRoomAPI) {
  //     setIsAudioMuted(videoRoomAPI.isLocalAudioMuted());
  //   }
  // }, [videoRoomAPI]);

  const joinRoom = useCallback(
    (roomNumber, username, userID) =>
      new Promise((resolve, reject) => {
        joinRoomAPI(videoRoomAPI, roomNumber, username, userID)
          .then(result => resolve(result))
          .catch(error => reject(error));
      }),
    [videoRoomAPI]
  );

  const leaveRoom = useCallback(() => {
    setLeaveRequestInProgress(true);
    if (isPublishingVideo) {
      return unpublishOwnFeedAPI(videoRoomAPI).then(() => {
        console.log(" leaveRoom -> We are now unpublishing video");
        setIsPublishingVideo(false);
        setLocalStream(null);
      });
    }
    return leaveRoomAPI(videoRoomAPI);
  }, [videoRoomAPI, isPublishingVideo]);

  const publishOwnFeed = useCallback(
    useAudio =>
      publishOwnFeedAPI(videoRoomAPI, useAudio).then(() => {
        console.log("We are now publishing video");
        setIsAudioMuted(videoRoomAPI.isAudioMuted());
        setIsPublishingVideo(true);
      }),
    [videoRoomAPI]
  );

  const unpublishOwnFeed = useCallback(
    () =>
      unpublishOwnFeedAPI(videoRoomAPI).then(() => {
        console.log("We are now unpublishing video");
      }),
    [videoRoomAPI]
  );

  const onLocalStream = useCallback(stream => {
    console.log("Got local stream: ", stream);
    setLocalStream(stream);
  }, []);

  const onErrorEvent = useCallback(error => {
    console.error("Encountered error: ", error);
  }, []);

  const refreshParticipants = useCallback(
    roomId => {
      console.log("refreshParticipants - roomId: ", roomId);
      listParticipantsAPI(videoRoomAPI, roomId).then(gotParticipants => {
        let newParticipants = {};
        gotParticipants.forEach((value, index) => {
          let id = value.id;
          newParticipants[id] = {
            name: value.display
            // publisher: value.publisher
          };
        });
        setParticipants(newParticipants);
        console.log("newParticipants: ", newParticipants);
      });
    },
    [videoRoomAPI]
  );

  const onRoomJoined = useCallback(
    msg => {
      console.log("Room joined: ", msg);
      videoRoomAPI.send({
        message: {
          request: "configure",
          bitrate: 0
        }
      });
      let myid = msg["id"];
      let roomId = msg["room"];
      let description = msg["description"];
      let myprivateid = msg["id"];
      setUser({ id: myid, private_id: myprivateid });
      // setMyPrivateId(msg["private_id"]);
      Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
      setCurrentRoom({ id: roomId, description: description, userID: myid });
      // listParticipantsAPI(videoRoomAPI, roomId).then(gotParticipants => {
      //   let newParticipants = {};
      //   gotParticipants.forEach((value, index) => {
      //     let id = value.id;
      //     newParticipants[id] = {
      //       name: value.display
      //       // publisher: value.publisher
      //     };
      //   });
      //   setParticipants(newParticipants);
      //   // console.log("newParticipants: ", newParticipants);
      // });
      refreshParticipants(roomId);
      setIsRoomJoined(true);
      if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
        var list = msg["publishers"];
        Janus.debug("Got a list of available publishers/feeds:");
        Janus.debug(list);
        console.log("Setting publishers list: ", list);
        setPublishersList(list);
      } else {
        console.log("Setting empty publishers list");
        setPublishersList([]);
      }
    },
    [videoRoomAPI]
  );

  const onPublisherLeft = useCallback(
    publisher => {
      console.log("Publisher left: ", publisher);
      if (publisher === "ok") {
        if (leaveRequestInProgress === true) {
          console.log("We left the room");
          setIsRoomJoined(false);
          // setCurrentRoom(null);
          // setLeaveRequestInProgress(false);
          // setPublishersList([]);
          console.log("Closing plugin handle");
          videoRoomAPI.hangup();
          videoRoomAPI.detach();
          // setVideoRoomAPI(null);

          // We need to recreate the session
          // console.log("Recreating session");
          // // setVideoRoomAPI(null);
          // createSession(pluginCBs);
        } else {
          console.log("We stopped streaming local video");
          // local stream became unpublished
          setIsPublishingVideo(false);
          setLocalStream(null);
        }
      } else {
        console.log("onPublisherLeft - Existing publishers: ", publishersList);
        let newPublishers = publishersList.filter(
          currentPublisher => currentPublisher.id !== publisher
        );
        console.log("onPublisherLeft - New publishers: ", newPublishers);
        if (publishersList.length !== newPublishers.length) {
          setPublishersList(newPublishers);
        }
      }
    },
    [publishersList, leaveRequestInProgress]
  );

  const onGotPublishers = useCallback(
    msg => {
      console.log("Got publishers: ", msg);
      let publishers = msg["publishers"];
      console.log(
        "onPublisher joined: Existing publishers list is: ",
        publishersList
      );
      let newPublishers = [...publishersList];
      newPublishers.push(...publishers);
      console.log("Setting publishers list: ", newPublishers);
      setPublishersList(newPublishers);
    },
    [publishersList]
  );

  const onParticipantJoined = useCallback(
    msg => {
      let newParticipant = msg["joining"];
      console.log("New participant: ", newParticipant);
      refreshParticipants(currentRoom.id);
      // let newParticipants = { ...participants };
      // let id = newParticipant.id;
      // newParticipants[id] = { name: newParticipant.display };
      // setParticipants(newParticipants);
      userCallbacks.onParticipantJoined &&
        userCallbacks.onParticipantJoined({
          id: newParticipant.id,
          name: newParticipant.display
        });
    },
    [userCallbacks, participants]
  );

  const onParticipantLeft = useCallback(
    msg => {
      let leftParticipantID = msg["leaving"];
      console.log("Participant left id: ", leftParticipantID);
      if (leftParticipantID === "ok") {
        if (leaveRequestInProgress === true) {
          console.log("We left the room");
          setIsRoomJoined(false);
        }
      } else {
        let participant = participants[leftParticipantID];
        refreshParticipants(currentRoom.id);
        // console.log("Participants is: ", participants);
        // let newParticipants = { ...participants };
        // delete newParticipants[leftParticipantID];
        // console.log("newParticipants is: ", newParticipants);
        // setParticipants(newParticipants);
        userCallbacks.onParticipantLeft &&
          userCallbacks.onParticipantLeft({
            ...participant,
            id: leftParticipantID
          });
      }
    },
    [leaveRequestInProgress, participants, userCallbacks]
  );

  const [pluginCBs] = useState(() => {
    return {
      onLocalStream,
      onErrorEvent,
      onRoomJoined,
      onGotPublishers,
      onParticipantJoined,
      onParticipantLeft,
      onPublisherLeft
    };
  });

  const initialized = useRef(false);
  if (!initialized.current) {
    doAttachToPlugin(pluginCBs);
    initialized.current = true;
  }

  useEffect(() => {
    // console.log("onRoomJoined changed");
    pluginCBs.onRoomJoined = onRoomJoined;
  }, [onRoomJoined]);

  useEffect(() => {
    // console.log("onGotPublishers changed");
    pluginCBs.onGotPublishers = onGotPublishers;
  }, [onGotPublishers]);

  useEffect(() => {
    // console.log("onParticipantJoined changed");
    pluginCBs.onParticipantJoined = onParticipantJoined;
  }, [onParticipantJoined]);

  useEffect(() => {
    // console.log("onParticipantLeft changed");
    pluginCBs.onParticipantLeft = onParticipantLeft;
  }, [onParticipantLeft]);

  useEffect(() => {
    // console.log("onPublisherLeft changed");
    pluginCBs.onPublisherLeft = onPublisherLeft;
  }, [onPublisherLeft]);

  useEffect(() => {
    // console.log("onLocalStream changed");
    pluginCBs.onLocalStream = onLocalStream;
  }, [onLocalStream]);

  // console.log("pluginCBs este:  ", pluginCBs);

  const toggleMute = useCallback(() => {
    var muted = videoRoomAPI.isAudioMuted();
    Janus.log((muted ? "Unmuting" : "Muting") + " local stream...");
    if (muted) videoRoomAPI.unmuteAudio();
    else videoRoomAPI.muteAudio();
    muted = videoRoomAPI.isAudioMuted();
    setIsAudioMuted(muted);
  }, [videoRoomAPI]);

  const setBitrateValue = useCallback(
    value => {
      console.log("Setting bitrate to: ", value);
      setBitrate(value);
      let localBitrate = parseInt(value) * 1000;
      if (localBitrate === 0) {
        Janus.log("Not limiting bandwidth via REMB");
      } else {
        Janus.log("Capping bandwidth to " + localBitrate + " via REMB");
      }
      videoRoomAPI.send({
        message: {
          request: "configure",
          bitrate: localBitrate
        }
      });
    },
    [videoRoomAPI]
  );

  return [
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
    setBitrateValue
  ];
};
