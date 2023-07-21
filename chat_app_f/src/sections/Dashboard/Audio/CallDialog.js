import React, { useRef } from "react";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Slide,
  Stack,
} from "@mui/material";


import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import axiosInstance from "../../../utils/axios";

import { socket } from "../../../socket";
import { ResetAudioCallQueue } from "../../../redux/slices/audioCall";
import { CDN_URL } from "../../../config";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);
  const audioStreamRef = useRef(null);

  //* 가능한 경우 call_params from call_params 사용 가능 => 수신자의 매개변수 사용

  const [call_details] = useSelector((state) => state.audioCall.call_queue);
  const {incoming} = useSelector((state) => state.audioCall);

  const { token } = useSelector((state) => state.auth);

  const appID = 699222126;
  const server = "wss://webliveroom699222126-api.coolzcloud.com/ws";
	        
  

  // roomID => 대화 아이디 => current_conversation.id
  // 토큰 => 백엔드에서 생성하고 앱에 연결합니다
  // 사용자 ID => 이 사용자의 ID
  // userName => 사용자 이름으로 형성된 슬러그

  const roomID = call_details?.roomID;
  const userID = call_details?.userID;
  const userName = call_details?.userName;

  // Step 1

  // Zego Express Engine 인스턴스 초기화
  const zg = new ZegoExpressEngine(appID, server);

  const streamID = call_details?.streamID;

  const handleDisconnect = (event, reason) => {
    if (reason && reason === "backdropClick") {
      return;
    } else {
      dispatch(ResetAudioCallQueue());

      // clean up event listners
      socket?.off("audio_call_accepted");
      socket?.off("audio_call_denied");
      socket?.off("audio_call_missed");

      // 원격 사용자에게 로컬 오디오 스트림 게시를 중지하고 해당 스트림 ID가 스트림에 전달된 stopPublishingStream 메서드를 호출합니다ID 매개 변수입니다
      zg.stopPublishingStream(streamID);
      // 원격 오디오 재생 중지
      zg.stopPlayingStream(userID);
      // destroy stream
      zg.destroyStream(audioStreamRef.current);
      // 룸에서 나감. 
      zg.logoutRoom(roomID);

      // 통화 연결 끊기 처리 => 이 대화 상자가 마운트 해제될 때 정리로 처리됩니다

      // 종료 호출 핸들대화 상자 닫기
      handleClose();
    }
  };

  useEffect(() => {
    // TODO => 오디오_call 이벤트 내보내기

    // 선택되지 않은 경우 30초 후 자동으로 호출을 거부하는 작업 생성

    const timer = setTimeout(() => {
      // TODO => 발신자 끝에 있는 이 줄에서 부재중 통화를 나타내는 오디오를 재생할 수 있습니다
      socket.emit(
        "audio_call_not_picked",
        { to: streamID, from: userID },
        () => {
          // TODO 중단 통화 => 통화 평결이 부재중으로 표시됩니다
        }
      );
    }, 30 * 1000);

    socket.on("audio_call_missed", () => {
      // TODO => 수신자 끝에서 통화가 누락되었음을 나타내는 오디오를 재생할 수 있습니다
      // Abort call
      handleDisconnect();
    });

    socket.on("audio_call_accepted", () => {
     // TODO => 통화가 시작되었음을 알리는 오디오를 재생할 수 있습니다
     // "call_not_not_message"에 대한 시간 초과 지우기
      clearTimeout(timer);
    });

    if (!incoming) {
      socket.emit("start_audio_call", {
        to: streamID,
        from: userID,
        roomID,
      });
    }

    socket.on("audio_call_denied", () => {
    // TODO => 통화가 거부되었음을 나타내는 오디오를 재생할 수 있습니다
    // 통화 중단
      handleDisconnect();
    });

    // 서버에 POST API 호출 및 토큰 가져오기
    
    let this_token;

    async function fetchToken() {
      // You can await here
      const response = await axiosInstance.post(
        "/user/generate-zego-token",
        {
          userId: userID,
          room_id: roomID,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(response, "TOKEN RESPONSE");
      this_token = response.data.token;
      // ...
    }
    fetchToken();

    // Step 2 => 브라우저 호환성 확인

    zg.checkSystemRequirements()
      .then((result) => {
        // The [result] indicates whether it is compatible. It indicates WebRTC is supported when the [webRTC] is [true]. For more results, see the API documents.

        // {
        //   webRTC: true,
        //   customCapture: true,
        //   camera: true,
        //   microphone: true,
        //   videoCodec: { H264: true, H265: false, VP8: true, VP9: true },
        //   screenSharing: true,
        //   errInfo: {}
        // }
        console.log(result);

        const { webRTC, microphone } = result;

        if (webRTC && microphone) {
          zg.loginRoom(
            roomID,
            this_token,
            { userID, userName },
            { userUpdate: true }
          )
            .then(async (result) => {
              console.log(result);

              //CreateStream 메서드를 호출한 후 추가 작업을 수행하기 전에 ZEGOCLOUD 서버가 로컬 스트림 개체를 반환할 때까지 기다려야 합니다.
             const localStream = await zg.createStream({
                camera: { audio: true, video: false },
              });

              audioStreamRef.current = localStream;

              // Get the audio tag.
              const localAudio = document.getElementById("local-audio");
              // 로컬 스트림은 MediaStream 개체입니다. 로컬 스트림을 비디오 또는 오디오의 srcObject 속성에 할당하여 오디오를 렌더링할 수 있습니다.
              localAudio.srcObject = localStream;

              // localStream은 이전 단계에서 createStream을 호출하여 만든 MediaStream 개체입니다.
              zg.startPublishingStream(streamID, localStream);

              zg.on("publisherStateUpdate", (result) => {
                // 스트림 게시 상태에 대한 업데이트를 위해 콜백합니다.
                // ...
                console.log(result);
                // * 이 정보를 사용하여 연결 상태를 표시할 수 있습니다
              });

              zg.on("publishQualityUpdate", (streamID, stats) => {
                // 스트림 게시 품질을 보고하기 위해 콜백합니다.
                // ...
                // console.log(스트림)ID, 통계);
                // * 이 정보를 사용하여 로컬 오디오 스트림 품질을 표시할 수 있습니다
              });
            })
            .catch((error) => {
              console.log(error);
            });

            //현재 사용자의 룸 연결 상태에 대한 업데이트를 위해 콜백합니다.
          zg.on("roomStateUpdate", (roomID, state, errorCode, extendedData) => {
            if (state === "DISCONNECTED") {
            // 방에서 연결이 끊어짐
            // * 사용자의 연결 끊김 상태를 표시하는 데 사용할 수 있습니다(특히 그룹 통화에서 유용)
            }

            if (state === "CONNECTING") {
            // 룸에 연결
            // * 사용자의 연결 상태를 표시하는 데 사용할 수 있습니다(특히 그룹 통화에서 유용)
            }

            if (state === "CONNECTED") {
            // 룸에 연결됨
            // * 사용자의 연결 상태를 표시하는 데 사용할 수 있습니다(특히 그룹 통화에서 유용)
            }
          });

          // 룸에 있는 다른 사용자의 상태에 대한 업데이트를 위해 콜백합니다.
          zg.on("roomUserUpdate", async (roomID, updateType, userList) => {
            console.warn(
              `roomUserUpdate: room ${roomID}, user ${
                updateType === "ADD" ? "added" : "left"
              } `,
              JSON.stringify(userList)
            );
            if (updateType !== "ADD") {
            
              handleDisconnect();
            } else {
              // const current_users = JSON.stringify(userList);
              // current_users_list를 사용하여 그룹 호출에서 동적 UI를 구축할 수 있습니다
              const remoteStream = await zg.startPlayingStream(userID);

              // Get the audio tag.
              const remoteAudio = document.getElementById("remote-audio");
              //로컬 스트림은 MediaStream 개체입니다. 로컬 스트림을 비디오 또는 오디오의 srcObject 속성에 할당하여 오디오를 렌더링할 수 있습니다.

              remoteAudio.srcObject = remoteStream;
              remoteAudio.play();
            }
          });

         // 룸의 스트림 상태에 대한 업데이트를 위해 콜백합니다.
          zg.on(
            "roomStreamUpdate",
            async (roomID, updateType, streamList, extendedData) => {
              if (updateType === "ADD") {
                // 새 스트림이 추가되었습니다. 스트림 재생을 시작하십시오.
                console.log(
                  "ADD",
                  roomID,
                  updateType,
                  streamList,
                  extendedData
                );

                // * 그룹 통화에서 여러 오디오 스트림을 만들고 재생하는 것이 매우 유용합니다
              } else if (updateType === "DELETE") {
                // 스트림이 삭제되었습니다. 스트림 재생을 중지하십시오.
                console.log(
                  "DELETE",
                  roomID,
                  updateType,
                  streamList,
                  extendedData
                );

                // * 오디오 스트림을 삭제하는 데 사용할 수 있습니다(그룹 통화에서 더 유용함)
              }
            }
          );

          zg.on("playerStateUpdate", (result) => {
          // 스트림 재생 상태에 대한 업데이트를 위해 콜백합니다.
          // ...
          // * 원격 오디오 스트림(연결, 연결 및 연결 끊김)의 상태를 실시간으로 표시하는 데 사용할 수 있습니다
          });

          zg.on("playQualityUpdate", (streamID, stats) => {
          // 스트림 재생 품질을 보고하기 위해 콜백합니다.
          // * 원격 오디오 스트림의 실시간 품질을 표시하는 데 사용할 수 있습니다
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleDisconnect}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogContent>
          <Stack direction="row" spacing={24} p={2}>
            <Stack>
              <Avatar
                sx={{ height: 100, width: 100 }}
                src={`${CDN_URL}/${call_details?.from_user?.avatar}`}
              />
              <audio id="local-audio" controls={false} />
            </Stack>
            <Stack>
              <Avatar
                sx={{ height: 100, width: 100 }}
                src={`${CDN_URL}/${user?.avatar}`}
              />
              <audio id="remote-audio" controls={false} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDisconnect} variant="contained" color="error">
            End Call
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CallDialog;
