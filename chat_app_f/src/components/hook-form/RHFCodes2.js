import { Stack, TextField } from '@mui/material';
import React from 'react'
import { Controller, useFormContext } from 'react-hook-form';
import { useRef } from "react";

const RHFCodes2 = ({ keyName ="", inputs = [], ...other}) => {
    const codeRef = useRef(null);
    
    const {control} = useFormContext();

    const handleChangeWithNextField = (event,handleChange) =>{

        const {maxLength,value,name} = event.target;

        const fieldIndex = name.replace(keyName,"");

        const fieldIntIndex = Number(fieldIndex);

        const nextField = document.querySelector(
            `input[name=${keyName}${fieldIntIndex+1}]`);

        if(value.length > maxLength){
            event.target.value = value[0];
        }
        // maxLength는 1이고 1보다 크다면..

        if(value.length >= maxLength && fieldIndex < 6 && nextField !== null){
            nextField.focus();
        }

        handleChange(event);
    };
 

  return (
    <Stack direction="row" spacing = {2} justifyContent="center" ref = {codeRef}>
        {inputs.map((name,index)=>(
            <Controller
                key = {name}
                name = {`${keyName}${index+1}`}
                control={control}
                render={({field, fieldState : {error}})=>(
                    <TextField
                        {...field}
                        error={!!error}
                        autoFocus={index === 0}
                        placeholder={"-"}
                        onChange={(event)=>{
                            handleChangeWithNextField(event,field.onChange);
                        }}
                        onFocus={(event) => event.currentTarget.select()}
                        InputProps={{
                            sx:{
                                width : {xs:36,sm:56},
                                height : {xs : 36, sm: 56},
                                "& input" : {p:0, textAlign : "center"},
                            },
                        }}
                        inputProps={{
                            mexLength : 1,
                            type : "number",
                        }}
                        {...other}
                    />
                )}
            ></Controller>
        ))}
    </Stack>
  )
}

export default RHFCodes2
