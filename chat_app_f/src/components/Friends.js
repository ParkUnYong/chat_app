import { Avatar, Box, Button, Typography, Stack, IconButton } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import React from 'react'
import { socket } from '../socket';
import StyledBadge from './StyledBadge'
import { Chat } from 'phosphor-react';


const user_id = window.localStorage.getItem("user_id");

const StyledChatBox = styled(Box)(({theme})=>({
    "&:hover" : {
        cursor : "pointer",
    },
}))
// 우리의 목표는 누군가 마우스를 가져가면 마우스 커버가 변경되는것.
// &:hover &는 상위 선택자에 대한 특수 기호고 hover은 마우스 커서가 해당 요소 위에 있을때를 나타냄.
//  theme는 현재 테마의 속성에 접근하는갓. 컴포넌트에서 해당 속성을 사용하여 스타일링이나 동적인 요소 처리 가능.



const UserComponent = ({firstName, lastName, _id, online, img}) => {
    const theme = useTheme();
    const name = `${firstName} ${lastName}`;
    // 테마를 가져오는것.
  return (
    <StyledChatBox
        sx = {{
            width : "100%",
            borderRadius : 1,
            backgroundColor : theme.palette.background.paper,
        }}
        p = {2}
    >

      <Stack
        direction="row"
        allignItems = {"center"}
        justifyContent="space-between"
      >
      <Stack
         direction="row"
         alignItems={"center"}
         spacing={2}
        >
        {" "}
        {online ? (
            <StyledBadge
                overlap = "circular"
                anchorOrigin={{vertical : "bottom", horizontal: "right"}}
                variant = "dot"
            >
             <Avatar alt={name} src = {img}/>
            </StyledBadge>
        ) : (
           <Avatar alt={name} src = {img}/>
        )}
        {/* 사용자가 온라인일 경우 스타일 배지와 함깨 아바타  아닐 경우 그냥 아바타만*/}
          <Stack spacing = {0.3}>
            <Typography variant='subtitle2'>{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
            <Button
                onClick={()=>{
                    socket.emit("friend_request",{to:_id, from:user_id}, ()=>{
                        alert("request snet");
                    });
                }}
            >
             Send Request
            </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  )
}


const FriendComponent = ({firstName, lastName, _id, online, img}) => {
    const theme = useTheme();
    const name = `${firstName} ${lastName}`;
    // 테마를 가져오는것.
  return (
    <StyledChatBox
        sx = {{
            width : "100%",
            borderRadius : 1,
            backgroundColor : theme.palette.background.paper,
        }}
        p = {2}
    >

      <Stack
        direction="row"
        allignItems = {"center"}
        justifyContent="space-between"
      >
      <Stack
         direction="row"
         alignItems={"center"}
         spacing={2}
        >
        {" "}
        {online ? (
            <StyledBadge
                overlap = "circular"
                anchorOrigin={{vertical : "bottom", horizontal: "right"}}
                variant = "dot"
            >
             <Avatar alt={name} src = {img}/>
            </StyledBadge>
        ) : (
           <Avatar alt={name} src = {img}/>
        )}
        {/* 사용자가 온라인일 경우 스타일 배지와 함깨 아바타  아닐 경우 그냥 아바타만*/}
          <Stack spacing = {0.3}>
            <Typography variant='subtitle2'>{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
            <IconButton onClick={()=>{
                // start a new conversation 
                socket.emit("start_conversation",{to : _id, from : user_id});
            }}>   {/* _id는 상대방 아이디 user_id는 대화를 시도하는 우리 아이디. */}
                <Chat />
            </IconButton>
        </Stack>
      </Stack>
    </StyledChatBox>
  )
}


const FriendRequestsComponent = ({firstName, lastName, _id, online, img, id }) => {
    const theme = useTheme();
    const name = `${firstName} ${lastName}`;
    // 테마를 가져오는것.
  return (
    <StyledChatBox
        sx = {{
            width : "100%",
            borderRadius : 1,
            backgroundColor : theme.palette.background.paper,
        }}
        p = {2}
    >

      <Stack
        direction="row"
        allignItems = {"center"}
        justifyContent="space-between"
      >
      <Stack
         direction="row"
         alignItems={"center"}
         spacing={2}
        >
        {" "}
        {online ? (
            <StyledBadge
                overlap = "circular"
                anchorOrigin={{vertical : "bottom", horizontal: "right"}}
                variant = "dot"
            >
             <Avatar alt={name} src = {img}/>
            </StyledBadge>
        ) : (
           <Avatar alt={name} src = {img}/>
        )}
        {/* 사용자가 온라인일 경우 스타일 배지와 함깨 아바타  아닐 경우 그냥 아바타만*/}
          <Stack spacing = {0.3}>
            <Typography variant='subtitle2'>{name}</Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
            <Button
                onClick={()=>{
                    socket.emit("accept_request",{ request_id : id }, ()=>{
                        alert("request snet");
                    });
                }}
            >
             Accept Request
            </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  )
}

export {UserComponent, FriendComponent, FriendRequestsComponent };