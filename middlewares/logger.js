// middlewares/logger.js
const winston = require("winston");
const fs = require("fs");
if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs");
}
require("winston-daily-rotate-file");

const transport = new winston.transports.DailyRotateFile({
    filename: "logs/%DATE%-app.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d"
});

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [transport]
});

const logreqres = () => {
    return (req, res, next) => {
        const start = Date.now();

        const originalJson = res.json;
        res.json = function (data) {
            logger.info({
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                response: data,
                duration: `${Date.now() - start}ms`
            });

            return originalJson.call(this, data);
        };

        next();
    };
};

module.exports = logreqres;