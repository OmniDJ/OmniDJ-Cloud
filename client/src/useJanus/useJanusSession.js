import { useRef, useCallback, useState, useEffect } from "react";
import { Janus } from "./janus";
import {
  attachToPlugin,
  listRoomsAPI,
  listParticipantsAPI,
  kickFromRoomAPI,
  createRoomAPI,
  destroyRoomAPI
} from "./api";

var opaqueId = "videoroomdj-" + Janus.randomString(12);

const initializeJanusIfNotAlreadyDid = () => {
  if (!Janus.initDone) {
    console.log("Must initialize Janus");
    Janus.init({
      //TODO: Disable debug for release
      // debug: "all",
      callback: function() {
        console.log("janus initialized");
      }
    });
  } else {
    console.log("Janus already initialized");
  }
};

export const createSessionAPI = ({ server, opaqueId, onSessionDestroyed }) => {
  return new Promise((resolve, reject) => {
    console.log("createSessionAPI called");
    initializeJanusIfNotAlreadyDid();
    //   var videoRoomAPI = null;
    //   var janusSession = null;
    //   var myid = null; // Our user ID, we get this when joined
    //   var mypvtid = null;

    var janusSession = new Janus({
      server: server,
      success: function() {
        // Attach to VideoRoom plugin
        resolve(janusSession);
      },
      error: function(error) {
        Janus.error(error);
        reject(error);
        //   message.error(error);
      },
      destroyed: function() {
        onSessionDestroyed && onSessionDestroyed();
        //   message.info("Janus session destroyed - isStarted: " + started);
        //   setCanJoinRoom(false);
      }
    });
  });
};

export const useJanusSession = ({ server }) => {
  const [connection, setConnection] = useState(null);
  // const [videoRoomAPI, setVideoRoomAPI] = useState(null);
  const [roomsList, setRoomsList] = useState([]);

  const onSessionDestroyed = useCallback(() => {
    console.log("Session destroyed");
  }, []);

  // useEffect(() => {
  //   console.log("janus session: ", janusSession);
  //   if (janusSession !== null) {
  //     console.log("Should update connection");
  //     let newConnection = {
  //       session: janusSession,
  //       api: videoRoomAPI,
  //       opaqueId: opaqueId
  //     };
  //     console.log("Settting new connection: ", newConnection);
  //     setConnection(newConnection);
  //   }
  // }, [janusSession, videoRoomAPI]);

  const onErrorEvent = useCallback(error => {
    console.error("Encountered error: ", error);
  }, []);

  const createSession = useCallback(
    pluginCallbacks => {
      createSessionAPI({
        server: server,
        opaqueId: opaqueId,
        onSessionDestroyed: onSessionDestroyed
      })
        .then(session => {
          console.log("Created session: ", session);
          // setJanusSession(session);
          attachToPlugin({
            opaqueId,
            session,
            callbacks: pluginCallbacks
          })
            .then(pluginHandle => {
              console.log("onPluginAttached: ", pluginHandle);
              // setVideoRoomAPI(pluginHandle);
              const newConnection = {
                session: session,
                api: pluginHandle,
                opaqueId: opaqueId
              };
              console.log("Settting new connection: ", newConnection);
              setConnection(newConnection);
            })
            .catch(error => {
              console.log("Error attaching plugin: ", error);
            });
        })
        .catch(error => console.log("Error creating session: ", error));
    },
    [server, onSessionDestroyed]
  );

  const createRoom = useCallback(
    ({ description, numPublishers, notify_joining }) =>
      createRoomAPI(connection.api, description, numPublishers, notify_joining),
    [connection]
  );

  const destroyRoom = useCallback(
    roomId => destroyRoomAPI(connection.api, roomId),
    [connection]
  );

  const kickFromRoom = useCallback(
    (roomNumber, userID) => kickFromRoomAPI(connection.api, roomNumber, userID),
    [connection]
  );

  useEffect(() => {
    console.log(
      "kickFromRoom changed: " + kickFromRoom + " - connection: " + connection
    );
  }, [kickFromRoom]);

  const listRooms = useCallback(() => listRoomsAPI(connection.api), [
    connection
  ]);

  const refreshRooms = useCallback(() => {
    listRooms().then(rooms => {
      console.log("Rooms is: ", rooms);
      setRoomsList(rooms);
    });
  }, [listRooms]);

  const listParticipants = useCallback(
    room => listParticipantsAPI(connection.api, room),
    [connection]
  );

  const [pluginCBs] = useState(() => {
    return {
      onErrorEvent
    };
  });

  const initialized = useRef(false);
  if (!initialized.current) {
    createSession(pluginCBs);
    initialized.current = true;
  }

  return [
    connection,
    createRoom,
    destroyRoom,
    listRooms,
    refreshRooms,
    roomsList,
    listParticipants,
    kickFromRoom
  ];
};
