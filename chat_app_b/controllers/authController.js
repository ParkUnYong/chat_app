const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mailService = require("../services/mailer");
const crypto = require("crypto");

const filterObj = require("../utils/filterObj");

const User = require("../models/user");
const otp = require("../Templates/Mail/otp");
const resetPassword = require("../Templates/Mail/resetPassword");
const { promisify } = require("util");
const catchAsync = require("../utils/catchAsync");

// 이 함수는 당신에게 jwt 토큰을 돌려줄 것입니다
const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// Register New User



exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password"
  );

  // 지정된 전자 메일을 가진 검증된 사용자가 있는지 확인합니다

  const existing_user = await User.findOne({ email: email });

  if (existing_user && existing_user.verified) {
    // 이 이메일을 가진 사용자가 이미 있습니다. 로그인하십시오
    return res.status(400).json({
      status: "error",
      message: "Email already in use, Please login.",
    });
  } else if (existing_user) {
    // 이전 업데이트보다 확인되지 않은 경우

    await User.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });

    // OTP를 생성하고 전자 메일로 전송
    req.userId = existing_user._id;
    next();
  } else {
    // 새 사용자를 생성하기 전에 사용자를 생성하지 않은 경우
    const new_user = await User.create(filteredBody);

    // OTP를 생성하고 전자 메일로 전송
    req.userId = new_user._id;
    next();
  }
});

exports.sendOTP = catchAsync(async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; //OTP 전송 후 10분

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time: otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log(new_otp);

  mailService.sendEmail({
    from: "qkrdns00@gmail.com",
    to: user.email,
    subject: "Verification OTP",
    html: otp(user.firstName, new_otp),
    attachments: [],
  });

  res.status(200).json({
    status: "success",
    message: "OTP Sent Successfully!",
  });
});

exports.verifyOTP = catchAsync(async (req, res, next) => {
  // OTP 확인 및 사용자 업데이트
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP가 정확할때 

  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
});

// 사용자 로그인
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;


  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
    return;
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "Incorrect password",
    });

    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
  });
});

// Protect
exports.protect = catchAsync(async (req, res, next) => {
  // 1) 토큰을 가져오고 토큰이 있는지 확인하는 중
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      message: "You are not logged in! Please log in to get access.",
    });
  }
  // 2) 토큰 확인 
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log(decoded);

  // 3) 사용자가 여전히 존재하는지 확인

  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    return res.status(401).json({
      message: "The user belonging to this token does no longer exists.",
    });
  }
  // 4) 토큰이 발급된 후 사용자가 암호를 변경했는지 확인
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      message: "User recently changed password! Please log in again.",
    });
  }

  // 보호된 경로에 대한 액세스 허용
  req.user = this_user;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) 게시된 전자 메일을 기반으로 사용자 가져오기
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with email address.",
    });
  }

  // 2) 임의 재설정 토큰 생성
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) 사용자 이메일로 보내기
  try {
    const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;
    // TODO => 이 재설정 URL이 포함된 이메일을 사용자의 이메일 주소로 보냅니다

    console.log(resetURL,"뉴URL");

    mailService.sendEmail({
      from: "qkrdns00@gmail.com",
      to: user.email,
      subject: "Reset Password",
      html: resetPassword(user.firstName, resetURL),
      attachments: [],
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "There was an error sending the email. Try again later!",
    });
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) 토큰을 기반으로 사용자 가져오기
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) 토큰이 만료되지 않았고 사용자가 있는 경우 새 암호 설정
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) 사용자의 변경된 PasswordAt 속성 업데이트
  // 4) 사용자 로그인 후 JWT 전송
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password Reseted Successfully",
    token,
  });
});
