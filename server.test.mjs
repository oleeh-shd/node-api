import { createServer } from "./http-server.mjs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import axios from "axios";

const UUID_REGEX =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

describe("Integration tests", () => {
    let server;
    let dir;
    beforeAll(async () => {
        dir = await mkdtemp(join(tmpdir(), "images-"));
        server = await createServer(dir);

        console.log(dir, "dir");
        await new Promise((resolve) => {
            server.once("listening", resolve);
            axios.defaults.baseURL = `http://localhost:${
                server.address().port
            }`;
        });
    });

    afterAll(async () => {
        server.close();
        rm(dir, { recursive: true, force: true });
    });

    test("GET /images", async () => {
        const { data } = await axios.get("/images");
        expect(Array.isArray(data)).toBeTruthy();
        expect(data.length).toBe(0);
    });

    test("POST /image/name", async () => {
        await axios.post("/image", Buffer.alloc(1024), {
            headers: {
                "Content-Type": "image/png",
            },
        });

        const [file] = await readdir(dir);
        const [fileName, fileExtension] = file.split(".");

        expect(fileName).toMatch(UUID_REGEX);
        expect(fileExtension).toBe("png");
    });

    test("reponse contains correct code and filename", async () => {
        const res = await axios.post("/image", Buffer.alloc(1024), {
            headers: {
                "Content-Type": "image/png",
            },
        });

        const [file] = await readdir(dir);

        expect(res.data).toBe(file);
        expect(res.status).toBe(201);
    });
});
