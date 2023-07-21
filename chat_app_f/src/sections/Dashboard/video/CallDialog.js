import React, { useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Slide,
  Stack,
} from "@mui/material";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../../utils/axios";
import { socket } from "../../../socket";
import { ResetVideoCallQueue } from "../../../redux/slices/videoCall";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();

  const audioStreamRef = useRef(null);
  const videoStreamRef = useRef(null);

 //* 가능한 경우 call_params from call_params 사용 가능 => 수신자의 매개변수 사용

  const [call_details] = useSelector((state) => state.videoCall.call_queue);
  const { incoming } = useSelector((state) => state.videoCall);

  const { token } = useSelector((state) => state.auth);

  const appID = 699222126;
  const server = "wss://webliveroom699222126-api.coolzcloud.com/ws";

  // roomID => 대화 아이디 => current_conversation.id
  // 토큰 => 백엔드에서 생성하고 앱에 연결합니다
  // 사용자ID => 이 사용자의 ID
  // userName => 사용자 이름으로 형성된 슬러그

  const roomID = call_details?.roomID;
  const userID = call_details?.userID;
  const userName = call_details?.userName;

  // Step 1

  // Zego Express Engine 인스턴스 초기화
  const zg = new ZegoExpressEngine(appID, server);

  const audioStreamID = `audio_${call_details?.streamID}`;
  const videoStreamID = `video_${call_details?.streamID}`;

  const handleDisconnect = (event, reason) => {
    if (reason && reason === "backdropClick") {
      return;
    } else {
      // 리스너 종료 
      socket?.off("video_call_accepted");
      socket?.off("video_call_denied");
      socket?.off("video_call_missed");

      // 원격 사용자에게 로컬 오디오 및 비디오 스트림 게시를 중지하고 해당 스트림 ID가 스트림에 전달된 stopPublishingStream 메서드를 호출합니다ID 매개 변수입니다.

      zg.stopPublishingStream(audioStreamID);
      zg.stopPublishingStream(videoStreamID);
      // 원격 오디오 재생 중지
      zg.stopPlayingStream(`audio_${userID}`);
      zg.stopPlayingStream(`video_${userID}`);
      zg.destroyStream(audioStreamRef.current);
      zg.destroyStream(videoStreamRef.current);
      // 방에서 로그아웃
      zg.logoutRoom(roomID);

      // 통화 연결 끊기 처리 => 이 대화 상자가 마운트 해제될 때 정리로 처리됩니다

      // 종료 호출 핸들대화 상자 닫기
      dispatch(ResetVideoCallQueue());
      handleClose();
    }
  };

  useEffect(() => {
    // TODO => video_call 이벤트 내보내기
    // 선택되지 않은 경우 30초 후 자동으로 호출을 거부하는 작업 생성

    const timer = setTimeout(() => {
      // TODO => 발신자 끝에 있는 이 줄에서 부재중 통화를 나타내는 오디오를 재생

      socket.emit(
        "video_call_not_picked",
        { to: call_details?.streamID, from: userID },
        () => {
          // TODO 중단 통화 => 통화 평결이 부재중으로 표시됩니다
        }
      );
    }, 30 * 1000);

    socket.on("video_call_missed", () => {
      // TODO => 수신자 끝에서 통화가 누락되었음을 나타내는 오디오를 재생
      // 통화 중단
      handleDisconnect();
    });

    socket.on("video_call_accepted", () => {
      // TODO => 통화가 시작되었음을 알리는 오디오를 재생
      // "video_call_not_message"에 대한 시간 초과 지우기
      clearTimeout(timer);
    });

    if (!incoming) {
      socket.emit("start_video_call", {
        to: call_details?.streamID,
        from: userID,
        roomID,
      });
    }

    socket.on("video_call_denied", () => {
    // TODO => 통화가 거부되었음을 나타내는 오디오를 재생
    // 통화 중단
      handleDisconnect();
    });

    // 서버에 POST API 호출 및 토큰 가져오기

    let this_token;

    async function fetchToken() {
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

    // 2단계 => 브라우저 호환성 확인

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

        const { webRTC, microphone, camera } = result;

        if (webRTC && microphone && camera) {
          zg.loginRoom(
            roomID,
            this_token,
            { userID, userName },
            { userUpdate: true }
          )
            .then(async (result) => {
              console.log(result);

              // CreateStream 메서드를 호출한 후 추가 작업을 수행하기 전에 ZEGOCLOUD 서버가 로컬 스트림 개체를 반환할 때까지 기다려야 합니다.
              const localAudioStream = await zg.createStream({
                camera: { audio: true, video: false },
              });
              const localVideoStream = await zg.createStream({
                camera: { audio: false, video: true },
              });

              audioStreamRef.current = localAudioStream;
              videoStreamRef.current = localVideoStream;

              // 오디오 태그를 가져옵니다.
              const localAudio = document.getElementById("local-audio");
              const localVideo = document.getElementById("local-video");
              // 로컬 스트림은 MediaStream 개체입니다. 로컬 스트림을 비디오 또는 오디오의 srcObject 속성에 할당하여 오디오를 렌더링
              localAudio.srcObject = localAudioStream;
              localVideo.srcObject = localVideoStream;

              localVideo.play();

             // localStream은 이전 단계에서 createStream을 호출하여 만든 MediaStream 개체입니다.
              zg.startPublishingStream(audioStreamID, localAudioStream);
              zg.startPublishingStream(videoStreamID, localVideoStream);

              zg.on("publisherStateUpdate", (result) => {
              // 스트림 게시 상태에 대한 업데이트를 위해 콜백합니다.
              // ...
                console.log(result);
                // * 이 정보를 사용하여 연결 상태를 표시
              });

              zg.on("publishQualityUpdate", (streamID, stats) => {
                // 스트림 게시 품질을 보고하기 위해 콜백
                // ...
                // console.log(스트림)ID, 통계);
                // * 이 정보를 사용하여 로컬 오디오 스트림 품질을 표시
              });
            })
            .catch((error) => {
              console.log(error);
            });

          // 현재 사용자의 룸 연결 상태에 대한 업데이트를 위해 콜백합니다
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
              // constcurrent_users = JSON.stringify(userList);
              // * current_users_list를 사용하여 그룹 호출에서 동적 UI를 구축할 수 있습니다
              const remoteAudioStream = await zg.startPlayingStream(
                `audio_${userID}`
              );
              const remoteVideoStream = await zg.startPlayingStream(
                `video_${userID}`
              );

              // 오디오 태그를 가져옵니다.
              const remoteAudio = document.getElementById("remote-audio");
              const remoteVideo = document.getElementById("remote-video");
              // 로컬 스트림은 MediaStream 개체입니다. 로컬 스트림을 비디오 또는 오디오의 srcObject 속성에 할당하여 오디오를 렌더링함.

              remoteAudio.srcObject = remoteAudioStream;
              remoteVideo.srcObject = remoteVideoStream;
              remoteAudio.play();
              remoteVideo.play();
            }
          });

          // 룸의 스트림 상태에 대한 업데이트를 위해 콜백
          zg.on(
            "roomStreamUpdate",
            async (roomID, updateType, streamList, extendedData) => {
              if (updateType === "ADD") {
                // 새 스트림이 추가되었습니다. 스트림 재생을 시작
                console.log(
                  "ADD",
                  roomID,
                  updateType,
                  streamList,
                  extendedData
                );

                // * 그룹 통화에서 여러 오디오 스트림을 만들고 재생하는 것이 매우 유용
              } else if (updateType === "DELETE") {
                // Stream deleted, stop playing the stream.
                console.log(
                  "DELETE",
                  roomID,
                  updateType,
                  streamList,
                  extendedData
                );

                // *오디오 스트림을 삭제하는 데 사용(그룹 호출에서 더 유용)
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
              <video
                style={{ height: 200, width: 200 }}
                id="local-video"
                controls={false}
              />
              <audio id="local-audio" controls={false} />
            </Stack>
            <Stack>
              <video
                style={{ height: 200, width: 200 }}
                id="remote-video"
                controls={false}
              />
              <audio id="remote-audio" controls={false} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleDisconnect();
            }}
            variant="contained"
            color="error"
          >
            End Call
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CallDialog;
