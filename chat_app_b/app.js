const express = require("express"); 
const morgan = require("morgan"); 

const routes = require("./routes/index");

const rateLimit = require("express-rate-limit"); // Express용 기본 속도 제한 미들웨어입니다. 이 명령을 사용하여 암호 재설정과 같은 공용 API 및/또는 엔드포인트에 대한 반복 요청을 제한합니다.
const helmet = require("helmet"); // 헬멧은 다양한 HTTP 헤더를 설정하여 Express 앱을 보호하는 데 도움이 됩니다. 그것은 은색 총알은 아니지만, 도움이 될 수 있습니다!

// 이 헤더들은 헬멧에 의해 응답으로 설정됩니다

// Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
// Cross-Origin-Embedder-Policy: require-corp
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Resource-Policy: same-origin
// Origin-Agent-Cluster: ?1
// Referrer-Policy: no-referrer
// Strict-Transport-Security: max-age=15552000; includeSubDomains
// X-Content-Type-Options: nosniff
// X-DNS-Prefetch-Control: off
// X-Download-Options: noopen
// X-Frame-Options: SAMEORIGIN
// X-Permitted-Cross-Domain-Policies: none
// X-XSS-Protection: 0

const mongosanitize = require("express-mongo-sanitize"); // 이 모듈은 req.body, req.query 또는 req.params에서 $ 기호로 시작하거나 .를 포함하는 모든 키를 개체에서 검색합니다.

// 기본적으로 $ 및 . 문자는 다음 위치의 사용자 제공 입력에서 완전히 제거됩니다:
// - req.body
// - req.params
// - req.headers
// - req.query

const xss = require("xss-clean"); // Node.js - 미들웨어를 연결하여 POST 본문, GET 쿼리 및 url 매개 변수에서 오는 사용자 입력을 검사합니다.

const bodyParser = require("body-parser"); 

// 수신 요청 본문을 처리기 앞에 있는 미들웨어에서 구문 분석하며, req.body 속성으로 사용할 수 있습니다.

const cors = require("cors"); // CORS는 다양한 옵션으로 CORS를 활성화하는 데 사용할 수 있는 Connect/Express 미들웨어를 제공하기 위한 node.js 패키지입니다.
const cookieParser = require("cookie-parser"); // 쿠키 헤더를 구문 분석하고 쿠키 이름으로 키가 지정된 개체로 req.cookies를 채웁니다.
const session = require("cookie-session"); // 간단한 쿠키 기반 세션 미들웨어.



const app = express();

app.use(
  cors({
    origin: "*",

    methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],

    credentials: true, //

    //   단순 쿠키 기반 sessiAccess-Control-Allow-Credentials는 true로 설정된 경우 브라우저에 프런트엔드 JavaScript 코드에 응답을 표시하도록 하는 헤더입니다. 인증 정보는 미들웨어의 쿠키, 인증 헤더 및 TLS 클라이언트 인증서로 구성됩니다.
  })
);

app.use(cookieParser());

// 빠른 응답 및 본문 파서 구성 설정
app.use(express.json({ limit: "10kb" })); // 최대 요청 본문 크기를 제어합니다. 숫자인 경우 값은 바이트 수를 지정하고 문자열인 경우 값은 구문 분석을 위해 바이트 라이브러리로 전달됩니다. 기본값은 '100kb'입니다.
app.use(bodyParser.json()); // json만 구문 분석하는 미들웨어를 반환합니다
app.use(bodyParser.urlencoded({ extended: true })); // URL 인코딩된 본문만 구문 분석하는 미들웨어를 반환합니다

app.use(
  session({
    secret: "keyboard cat",
    proxy: true,
    resave: true,
    saveUnintialized: true,
    cookie: {
      secure: false,
    },
  })
);

app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 3000,
  windowMs: 60 * 60 * 1000, // In one hour
  message: "Too many Requests from this IP, please try again in an hour!",
});

app.use("/tawk", limiter);

app.use(
  express.urlencoded({
    extended: true,
  })
); // URL 인코딩된 본문만 구문 분석하는 미들웨어를 반환합니다
app.use(mongosanitize());

app.use(xss());

app.use(routes);

module.exports = app;