import { createServer as createHTTPServer } from "node:http";
import { open, readdir, unlink, access, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { contentType, extension } from "mime-types";
import path from "node:path";
import sharp from "sharp";
import { server as WebsocketServer } from "websocket";

export const prepare = async () => {
    const ASSETS_DIR_NAME = "images";
    const ASSETS_DIR_PATH = path.join(".", ASSETS_DIR_NAME);

    const hasAssetDir = await access(ASSETS_DIR_PATH).then(
        () => true,
        () => false
    );

    if (!hasAssetDir) {
        await mkdir(ASSETS_DIR_PATH);
    }

    return ASSETS_DIR_PATH;
};

export const createServer = (ASSETS_DIR_PATH) => {
    const server = createHTTPServer(async (req, res) => {
        if (req.method === "POST" && req.url === "/image") {
            const fileName = `${randomUUID()}.${extension(
                req.headers["content-type"]
            )}`;

            try {
                const file = await open(
                    path.join(ASSETS_DIR_PATH, fileName),
                    "a"
                );
                req.pipe(file.createWriteStream());
                res.statusCode = 201;
                res.end(fileName);

                wsServer.broadcast(`Image ${fileName} successfully added`);
            } catch (e) {
                res.setHeader("Content-Type", "html");
                res.statusCode = 500;
                res.end("<h1>An error uccored</h1>");
            }
        } else if (req.method === "GET" && req.url === "/images") {
            try {
                const images = await readdir(ASSETS_DIR_PATH);

                res.setHeader("Content-Type", contentType("json"));
                res.write(JSON.stringify(images));
                res.statusCode = 200;
                res.end();
            } catch (e) {
                res.setHeader("Content-type", "html");
                res.statusCode = 500;
                res.end("<h1>An error occured</h1>");
            }
        } else if (req.method === "GET" && req.url.startsWith("/image/")) {
            const imageName = req.url.split("/").pop();

            try {
                const file = await open(
                    path.join(ASSETS_DIR_PATH, imageName),
                    "r"
                );
                res.setHeader("Content-Type", contentType(imageName));
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${imageName}"`
                );
                const transform = sharp().resize(200, 200);
                const readStream = file.createReadStream();

                readStream.pipe(transform).pipe(res);
                res.statusCode = 200;
            } catch (e) {
                res.setHeader("Content-Type", "html");
                res.statusCode = 404;
                res.end("<h1>NOT FOUND</h1>");
            }
        } else if (req.method === "DELETE" && req.url.startsWith("/image/")) {
            const imageName = req.url.split("/").pop();

            try {
                await unlink(path.join(ASSETS_DIR_PATH, imageName));
                res.statusCode = 204;
                res.end("<h1>DELETED</h1>");
            } catch (e) {
                res.setHeader("Content-Type", "html");
                res.statusCode = 404;
                res.end("<h1>NOT FOUND</h1>");
            }
        }
    });

    server.listen(() =>
        console.log(`Server listening on ${server.address().port}`)
    );

    const wsServer = new WebsocketServer({
        httpServer: server,
        autoAcceptConnections: true,
    });

    return server;
};
