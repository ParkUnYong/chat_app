import AWS from 'aws-sdk';
import {  AWS_S3_REGION } from '../config';

const S3 = new AWS.S3({
  signatureVersion: 'v4',
  region: AWS_S3_REGION,
});


export default S3;
