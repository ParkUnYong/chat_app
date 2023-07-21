import { createSlice } from "@reduxjs/toolkit";
import { socket } from "../../socket";
import axios from "../../utils/axios";

const initialState = {
  open_video_dialog: false,
  open_video_notification_dialog: false,
  call_queue: [], // 언제든지 최대 1회의 통화 가능
  incoming: false,
};

const slice = createSlice({
  name: "videoCall",
  initialState,
  reducers: {
    pushToVideoCallQueue(state, action) {
      // redux 스토어에서 video_call_message 확인

      if (state.call_queue.length === 0) {
        state.call_queue.push(action.payload.call);
        if (action.payload.incoming) {
          state.open_video_notification_dialog = true; // 통화 대화 상자가 열림.
          state.incoming = true;
        }
        else {
          state.open_video_dialog = true;
          state.incoming = false;
        }
      } else {
        // 대기열이 비어 있지 않으면 user_is_message =>를 내보내고 서버가 이 이벤트를 호출 발신인에게 보냄.
        socket.emit("user_is_busy_video_call", { ...action.payload });
      }

      // 서버 측에서 대기열을 관리하는 것이 이상적임
    },
    resetVideoCallQueue(state, action) {
      state.call_queue = [];
      state.open_video_notification_dialog = false;
      state.incoming = false;
    },
    closeNotificationDialog(state, action) {
      state.open_video_notification_dialog = false;
    },
    updateCallDialog(state, action) {
      state.open_video_dialog = action.payload.state;
      state.open_video_notification_dialog = false;
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export const StartVideoCall = (id) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.resetVideoCallQueue());
    axios
      .post(
        "/user/start-video-call",
        { id },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getState().auth.token}`,
          },
        }
      )
      .then((response) => {
        console.log(response);
        dispatch(
          slice.actions.pushToVideoCallQueue({
            call: response.data.data,
            incoming: false,
          })
        );
      })
      .catch((err) => {
        console.log(err);
      });
  };
};

export const PushToVideoCallQueue = (call) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.pushToVideoCallQueue({call, incoming: true}));
  };
};

export const ResetVideoCallQueue = () => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.resetVideoCallQueue());
  };
};

export const CloseVideoNotificationDialog = () => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.closeNotificationDialog());
  };
};

export const UpdateVideoCallDialog = ({ state }) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateCallDialog({ state }));
  };
};
