const profileRoute = require("./routes/v1/profile");
const profilesRoute = require("./routes/v1/profiles");
const NotFound = require("./middleware/notfound");
const Auth = require("./middleware/auth");
const ErrorHandler = require("./middleware/errorhandler");
const rateLimit = require("express-rate-limit");
const express = require("express");
const app = express();
const refreshCollections = require("./data/refreshCollections");
const refreshPrices = require("./data/refreshPrices");
const refreshAuctions = require("./data/refreshAuctions");
const checkForUpdate = require("./middleware/checkforupdate");
const port = process.env.PORT || 3002;

process.on("uncaughtException", (error) => console.log(error));
process.on("unhandledRejection", (error) => console.log(error));

const limiter = rateLimit({
  windowMs: 1000 * 60,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many requests, please try again later.",
  },
});

app.use(express.static(__dirname + "/public"));
app.use(require("cors")());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

app.get("/v1/profile/:uuid/:profileid", Auth, profileRoute);
app.get("/v1/profiles/:uuid", Auth, profilesRoute);

app.use(NotFound);
app.use(ErrorHandler);

refreshCollections();
refreshPrices();
refreshAuctions();
checkForUpdate();

app.listen(port, () => {
  console.log(`Now listening on port ${port} | started pterodactyl`);
});
