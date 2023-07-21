import io from "socket.io-client"; // Add this

let socket;

const connectSocket = (user_id) => {
  socket = io("https://api.chat-app.rebito.site/", {
    query: `user_id=${user_id}`,
  });
} 

export {socket, connectSocket};


// 소켓 인스턴스가 기본적으로 그냥 뚝 하고 생기는게 아니라 
// connectSocket을 호출하면 그 소켓 인스턴스만 실행됨. 
// 유저 id는 사용자가 로그인한 경우만 실행됨. 
