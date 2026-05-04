import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const isProd = process.env.NODE_ENV === "production" || !!process.env.REPLIT_DEPLOYMENT;

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: Request) {
        return {
          id: (req as any).id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const REPLIT_ORIGIN = "https://stay-cloud-platform--marlenebio1988.replit.app";

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim().replace(/\/+$/, ""))
  : [REPLIT_ORIGIN];

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, "CORS : origine bloquée");
        cb(null, false);
      }
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET ?? "lb-stay-cloud-secret-2026";
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "none" as const,
    },
  }),
);

app.use("/api", router);

export default app;
