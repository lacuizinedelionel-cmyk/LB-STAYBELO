import app from "./app";
import { logger } from "./lib/logger";
import { ensureDemoAdmin } from "./routes/auth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  await ensureDemoAdmin();
  logger.info("Compte admin démo vérifié — démarrage du serveur…");

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Erreur au démarrage du serveur");
      process.exit(1);
    }

    logger.info({ port }, "Serveur en écoute");
  });
}

start().catch((err) => {
  logger.error(err, "Échec au démarrage");
  process.exit(1);
});
