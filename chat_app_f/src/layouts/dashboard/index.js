import React, { useEffect } from "react";
import { Select, Stack } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";
import useResponsive from "../../hooks/useResponsive";
import SideNav from "./SideNav";
import { useDispatch, useSelector } from "react-redux";
import { FetchUserProfile, SelectConversation, showSnackbar } from "../../redux/slices/app";
import { socket, connectSocket } from "../../socket";
import {
  UpdateDirectConversation,
  AddDirectConversation,
  AddDirectMessage,
} from "../../redux/slices/conversation";
import AudioCallNotification from "../../sections/Dashboard/Audio/CallNotification";
import VideoCallNotification from "../../sections/Dashboard/video/CallNotification";
import {
  PushToAudioCallQueue,
  UpdateAudioCallDialog,
} from "../../redux/slices/audioCall";
import AudioCallDialog from "../../sections/Dashboard/Audio/CallDialog";
import VideoCallDialog from "../../sections/Dashboard/video/CallDialog";
import { PushToVideoCallQueue, UpdateVideoCallDialog } from "../../redux/slices/videoCall";
import { showSnackbar2 } from "../../redux/slices/app";

const DashboardLayout = () => {
  const isDesktop = useResponsive("up", "md");
  const dispatch = useDispatch();
  const { user_id } = useSelector((state) => state.auth);
  const { open_audio_notification_dialog, open_audio_dialog } = useSelector(
    (state) => state.audioCall
  );
  const { open_video_notification_dialog, open_video_dialog } = useSelector(
    (state) => state.videoCall
  );
  const { isLoggedIn } = useSelector((state) => state.auth);
  const { conversations, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );

  useEffect(() => {
    dispatch(FetchUserProfile());
  }, []);


  const handleCloseAudioDialog = () => {
    dispatch(UpdateAudioCallDialog({ state: false }));
  };
  const handleCloseVideoDialog = () => {
    dispatch(UpdateVideoCallDialog({ state: false }));
  };

  const user_id2 = window.localStorage.getItem("user_id");

  useEffect(() => {

    if (isLoggedIn) {
      window.onload = function () {
        if (!window.location.hash) {
          window.location = window.location + '#loaded';
          window.location.reload();

        }
      }
      // 이 익명 함수는 레이아웃을 로드 할때마다 url을 체크인 해서 마지막에 해시가 있으면 #loaded가 로드된것처럼함
      // 없으면 추가하고 기본적으로 페이지를 리로드함. 이러면 기본적으로 로그인 하면 1번 페이지를 리로드함.
      // 이렇게 하면 기본적으로 소켓 인스턴스에 연결됨.

      window.onload();

      if (!socket) {
        connectSocket(user_id)  //(user_id2);
      }

      // "new_friend_request" 
      // 기본적 흐름은 서버에서 클라이언트로 클라이언트에서 수신하고 서버로 응답
      socket.on("audio_call_notification", (data)=>{
        dispatch(PushToAudioCallQueue(data));
      });

      socket.on("video_call_notification", (data) => {
        dispatch(PushToVideoCallQueue(data));
      })

      socket.on("new_message", (data) =>{
        const message = data.message;
        console.log(current_conversation, data);
        if(current_conversation?.id === data.conversation_id){
          dispatch(
            AddDirectMessage({
              id : message._id,
              type : "msg",
              subtype : message.type,
              message : message.text,
              incoming : message.to === user_id,
              outgoing : message.from === user_id,
            })
          )
        }
      })



      socket.on("start_chat", (data)=>{
         console.log(data);
         const existing_conversation = conversations.find((el)=> el?.id ===  data._id);
         // data는 하나의 대화로써 자체 id가 있음. 몽구스 id일수도 있음. 
         // 그래서 우리는 저것들이 일치한다면 그것들을 비교하는것 
         // 함수의 조건문이 true를 반환한다면 기존 대화가 있음을 의미 

         if(existing_conversation){
          dispatch(UpdateDirectConversation({conversation: data}));
         }else{
          dispatch(AddDirectConversation({conversation : data}));
         }
         dispatch(SelectConversation({room_id : data._id}));
      });

      socket.on("new_friend_request", (data) => {
        dispatch(showSnackbar2({ severity: "success", message: "New friend request received" }));
      });
      socket.on("request_accepted", (data) => {
        dispatch(showSnackbar2({ severity: "success", message: "Friend Request Accepted" }));
      });
      socket.on("request_sent", (data) => {
        dispatch(showSnackbar2({ severity: "success", message: data.message }));
      });
       
    }

    return () => {
      socket?.off("new_friend_request");
      socket?.off("request_accepted");
      socket?.off("request_sent");
      socket?.off("start_chat");
      socket?.off("new_message");
      socket?.off("audio_call_notification");
    }    
    // 구성 요소가 마운트 해제될때마다 호출됨.


  }, [isLoggedIn, socket]);
  // 새 소켓 인스턴스가 생성될떄 마다 혹은 로그인하거나 로그아웃 하려면 여기서 논리 시작


  if (!isLoggedIn) {
    return <Navigate to={"/auth/login"} />;
  }

  return (
    <>
      <Stack direction="row">
        {isDesktop && (
          // SideBar
          <SideNav />
        )}

        <Outlet />
      </Stack>
      {open_audio_notification_dialog && (
        <AudioCallNotification open={open_audio_notification_dialog} />
      )}
      {open_audio_dialog && (
        <AudioCallDialog
          open={open_audio_dialog}
          handleClose={handleCloseAudioDialog}
        />
      )}
      {open_video_notification_dialog && (
        <VideoCallNotification open={open_video_notification_dialog} />
      )}
      {open_video_dialog && (
        <VideoCallDialog
          open={open_video_dialog}
          handleClose={handleCloseVideoDialog}
        />
      )}
    </>
  );
};

export default DashboardLayout;
