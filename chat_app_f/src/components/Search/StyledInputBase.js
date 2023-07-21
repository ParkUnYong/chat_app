import { InputBase } from "@mui/material";
import {styled} from "@mui/material/styles";


  const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: "inherit",
    "& .MuiInputBase-input": {
      padding: theme.spacing(1, 1, 1, 0),
      // 세로 패딩 + 검색의 글꼴 크기아이콘
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
      width: "100%",
    },
  }));

  export default StyledInputBase;