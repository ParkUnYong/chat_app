const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down ...");
  process.exit(1); // 종료 코드 1은 응용 프로그램 오류로 인해 컨테이너가 종료되었음을 나타냅니다.
});

const app = require("./app");

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
// 소켓 io
// Add this

const { promisify } = require("util");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");
const AudioCall = require("./models/audioCall");
const VideoCall = require("./models/videoCall");

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    // useNewUrlParser: true, // 기본 MongoDB 드라이버가 현재 연결 문자열 파서를 사용하지 않습니다. 이는 중요한 변경 사항이기 때문에 사용자가 새 파서에서 버그를 발견하면 이전 파서로 폴백할 수 있도록 NewUrlParser 플래그를 추가했습니다.
    // useCreateIndex: true, // 이전에도 MongoDB는 확인을 사용했습니다인덱스 함수를 호출하여 인덱스가 있는지 확인하고 인덱스가 없는 경우 인덱스를 만듭니다. 이 역시 생성을 위해 더 이상 사용되지 않습니다인덱스 . useCreateIndex 옵션을 사용하면 새 함수 호출을 사용할 수 있습니다.
    // useFindAndModify: false, // findAndModify는 더 이상 사용되지 않습니다. 대신 findOneAndUpdate, findOneAndReplace 또는 findOneAndDelete를 사용합니다.
    // useUnifiedTopology: true, //true로 설정하면 MongoDB 드라이버의 새 연결 관리 엔진을 사용할 수 있습니다. 이 옵션을 true로 설정해야 합니다. 단, 안정적인 연결을 유지할 수 없는 경우는 예외입니다.
  })
  .then((con) => {
    console.log("DB Connection successful");
  })
  .catch((err)=>{
    console.log("err");
  });

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
});



// Add this 소켓 io 작성

//Listen for when the client connects via socket.io-client
 io.on("connection", async (socket) => {
  console.log(JSON.stringify(socket.handshake.query));
  const user_id = socket.handshake.query["user_id"];

  console.log(`User connected ${socket.id}`);

  if (user_id != null && Boolean(user_id)) {
    try {
      await User.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
        status: "Online",
      });
    } catch (e) {
      console.log(e);
    }
  }


  socket.on("friend_request", async (data) =>{
    console.log(data.to);

    // data => {to,from}
    // 누가 요청했고 누가 받았고 그런거 구현인듯
    const to_user = await User.findById(data.to).select("socket_id");
    const from_user = await User.findById(data.from).select("socket_id");

    // 친구요청 이벤트 만들기
    await FriendRequest.create({
      sender : data.from,
      recipient : data.to,
    })
    
    // emit event => "new_friend_request"
    io.to(to_user?.socket_id).emit("new_friend_request",{
      // 수신자와 발신자 정보를 포함할 요청 id 입니다.
      message : "New Friend Request Received"
    });

    // emit event => "request_user"
    io.to(from_user?.socket_id).emit("request_sent",{
      // 수신자와 발신자 정보를 포함할 요청 id 입니다.
      message : "Request sent successfully!"
    });
    // emit evnet => request
    // 특정 이벤트를 소켓 id로 보낼거임.
    // 또는 특정 클라이언트에게 다음과 같이 말할 수 있음. 그리고 해당 이름 전달

  });
  socket.on("accept_request", async (data) =>{
     // 1) 서버에서 이벤트를 수신하면 요청을 수락하는거임

    console.log(data,"accept_request");

    const request_doc = await FriendRequest.findById(data.request_id);
    // 2) 그러기 위해서 요청문서를 가져옴.
    
    console.log(request_doc,"request_doc");

    // request_id

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);
    // 3) 그것을 위해서 수신자와 발신자 문서를 가져옴.

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);
    // 4) 그들의 기록을 업데이트.(friend 배열에)

    await receiver.save({new : true , validateModifiedOnly : true});
    await sender.save({new : true , validateModifiedOnly : true});
    // 5) 이러캐 작성하면 업데이트된 최신문서 반환. 그래서 옵션에 new:true 주는거
    // 6) validateModifiedOnly는 쿼리에서 수정된것에만 유효성검사 지정
    // 위에서 friend 필드를 수정했으니 유효성 검사 기능은 친구 필드에서만

    await FriendRequest.findByIdAndDelete(data.request_id);
    // 7) 이제 수락을 하던 거절을 하던 친구 요청창이 없어져야함. 그러기 위해 일단 대기 작성
    // FriendRequest에서 내 아이디를 찾아서 삭제하는 로직. 삭제하려는 요청 문서의 ID 전달

    io.to(sender?.socket_id).emit("request_accepted",{
      message : "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted",{
      message : "Friend Request Accepted",
    });
    // 요청이 수락됬다고 각 사용자에게 이벤트를 내보내는 부분 

  });



  socket.on("get_direct_conversations", async ({user_id},callback) => {
    const existing_conversations = await OneToOneMessage.find({
      participants : {$all : [user_id]},
      // 직접 채팅에 참여하는 모든 레코드 검색
    }).populate("participants","firstName lastName avatar _id email status"); //avatar

    console.log(existing_conversations,"겟 다이렉트 컨버세이션")

    callback(existing_conversations);
  })



  socket.on("start_conversation", async (data) => {
    // data: {to: from:}

    const { to, from } = data;

    // 기존 대화가 있는지 확인

    const existing_conversations = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status");

    console.log(existing_conversations[0], "Existing Conversation");

    //no => 없는 경우 새로운 OneToOneMessage 문서를 만들고 "start_chat" 이벤트를 내보내고 대화 세부 정보를 페이로드로 보냅니다
    if (existing_conversations.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });

      new_chat = await OneToOneMessage.findById(new_chat).populate(
        "participants",
        "firstName lastName _id email status"
      );

      console.log(new_chat);

      socket.emit("start_chat", new_chat);
    }
    // if yes => 이벤트 "start_chat"을 보내고 대화 세부 정보를 페이로드로 보냅니다
    else {
      socket.emit("start_chat", existing_conversations[0]);
    }
  });



  socket.on("get_messages", async (data, callback) => {
    try {
      const { messages } = await OneToOneMessage.findById(
        data.conversation_id
      ).select("messages");
      callback(messages);
    } catch (error) {
      console.log(error);
    }
  });

  // 들어오는 텍스트/링크 메시지 처리
  socket.on("text_message", async (data) => {
    console.log("Received message:", data);

    // data: {to, from, text}

    const { message, conversation_id, from, to, type } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    console.log(conversation_id,"방번호");

    // message => {to, from, type, created_at, text, file}

    const new_message = {
      to: to,
      from: from,
      type: type,
      created_at: Date.now(),
      text: message,
    };
     
    console.log(new_message,"뉴메세지");

    // OneToOne Message Doc 가져오기 및 기존 대화에 새 메시지 푸시
    const chat = await OneToOneMessage.findById(conversation_id);
    
    console.log(chat,"chat 몽고");
    chat.messages.push(new_message);
    // save to db`
    await chat.save({ new: true, validateModifiedOnly: true });

    // emit incoming_message -> to user

    io.to(to_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });

    // emit outgoing_message -> from user
    io.to(from_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });
  });

  // 미디어/문서 메시지 처리
  socket.on("file_message", (data) => {
    console.log("Received message:", data);

    // data: {to, from, text, file}

    // Get the file extension
    const fileExtension = path.extname(data.file.name);

    // 고유한 파일 이름 생성
    const filename = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;

  });

  // -------------- HANDLE AUDIO CALL SOCKET EVENTS ----------------- //

  // handle start_audio_call event
  socket.on("start_audio_call", async (data) => {
    const { from, to, roomID } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    console.log("to_user", to_user);

    // 호출 수신자에게 통지 보내기
    io.to(to_user?.socket_id).emit("audio_call_notification", {
      from: from_user,
      roomID,
      streamID: from,
      userID: to,
      userName: to,
    });
  });

  // audio_call_not_message를 처리합니다
  socket.on("audio_call_not_picked", async (data) => {
    console.log(data);
    // 통화 기록 찾기 및 업데이트
    const { to, from } = data;

    const to_user = await User.findById(to);

    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Missed", status: "Ended", endedAt: Date.now() }
    );

    io.to(to_user?.socket_id).emit("audio_call_missed", {
      from,
      to,
    });
  });

  // handle audio_call_accepted
  socket.on("audio_call_accepted", async (data) => {
    const { to, from } = data;

    const from_user = await User.findById(from);

    // 통화 기록 찾기 및 업데이트
    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Accepted" }
    );

    // TODO => 호출 발신자에게 호출_발송
    io.to(from_user?.socket_id).emit("audio_call_accepted", {
      from,
      to,
    });
  });

  // handle audio_call_denied
  socket.on("audio_call_denied", async (data) => {
    // 통화 기록 찾기 및 업데이트
    const { to, from } = data;

    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Denied", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => 호출 발신자에게 호출_발송

    io.to(from_user?.socket_id).emit("audio_call_denied", {
      from,
      to,
    });
  });

  // handle user_is_busy_audio_call
  socket.on("user_is_busy_audio_call", async (data) => {
    const { to, from } = data;
    // 통화 기록 찾기 및 업데이트
    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Busy", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => emit on_another_audio_call to sender of call
    io.to(from_user?.socket_id).emit("on_another_audio_call", {
      from,
      to,
    });
  });

  // --------------------- HANDLE VIDEO CALL SOCKET EVENTS ---------------------- //

  // start_video_call 이벤트 처리
  socket.on("start_video_call", async (data) => {
    const { from, to, roomID } = data;

    console.log(data);

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    console.log("to_user", to_user);

    // 호출 수신자에게 통지 보내기
    io.to(to_user?.socket_id).emit("video_call_notification", {
      from: from_user,
      roomID,
      streamID: from,
      userID: to,
      userName: to,
    });
  });

  // video_call_not_message 처리
  socket.on("video_call_not_picked", async (data) => {
    console.log(data);
    // 통화 기록 찾기 및 업데이트
    const { to, from } = data;

    const to_user = await User.findById(to);

    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Missed", status: "Ended", endedAt: Date.now() }
    );

    // TODO => 호출 수신자에게 호출_발송
    io.to(to_user?.socket_id).emit("video_call_missed", {
      from,
      to,
    });
  });

  // handle video_call_accepted
  socket.on("video_call_accepted", async (data) => {
    const { to, from } = data;

    const from_user = await User.findById(from);

    // find and update call record
    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Accepted" }
    );

    // TODO => emit call_accepted to sender of call
    io.to(from_user?.socket_id).emit("video_call_accepted", {
      from,
      to,
    });
  });

  // video_call_dll 처리
  socket.on("video_call_denied", async (data) => {
    // 통화 기록 찾기 및 업데이트
    const { to, from } = data;

    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Denied", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => 호출 발신자에게 호출_발송

    io.to(from_user?.socket_id).emit("video_call_denied", {
      from,
      to,
    });
  });

  // handle user_is_busy_video_call
  socket.on("user_is_busy_video_call", async (data) => {
    const { to, from } = data;
    // 통화 기록 찾기 및 업데이트
    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Busy", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => 통화 발신자에게 _another_video_call 전송
    io.to(from_user?.socket_id).emit("on_another_video_call", {
      from,
      to,
    });
  });


  socket.on("get_message2",  async (data,callback)=>{
    // 콜백의 인수로 메시지 목록
    // 어떤 대화에 대해 메시지를 받고 싶은지
    const {messages2} = await OneToOneMessage.findById(data.conversation_id).select("messages");
    callback(messages2);
    // 클라이언트쪽에서 메세지를 받는 이벤트
  })

  //연습용 Handle text/link messages

 


  // -------------- HANDLE SOCKET DISCONNECTION ----------------- //

  socket.on("end", async (data) => {
    // ID로 사용자 찾기 및 상태를 오프라인으로 설정

    if (data.user_id) {
      await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
    } 

    // 이 사용자가 오프라인 상태임을 이 사용자의 모든 대화방에 브로드캐스트(연결 끊김)

    console.log("closing connection");
    socket.disconnect(0);
  });
});




process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("UNHANDLED REJECTION! Shutting down ...");
  server.close(() => {
    process.exit(1); //  종료 코드 1은 응용 프로그램 오류로 인해 컨테이너가 종료되었음을 나타냅니다.
  });
});
