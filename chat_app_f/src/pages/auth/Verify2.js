import { Stack, Typography } from '@mui/material';
import React from 'react';
import VerifyForm2 from '../../sections/auth/VerifyForm2';

function Verify2() {
    return (
        <>
            <Stack spacing={2} sx={{ mb: 5, position: "relative" }}>
                <Typography variant="h4">Please Verify OTP</Typography>
                 
                <Stack direction={"row"} spacing={0.5}>
                    <Typography variant='body2'>sent to email(qkrdns00@gmail.com)</Typography>
                </Stack>
            </Stack>
            {/* {verify Form} */}
            <VerifyForm2/>

        </>
    );
}

export default Verify2;