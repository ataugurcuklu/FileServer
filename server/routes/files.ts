import { Hono } from "hono";
import fs from "fs";
import path from "path";
import { FileModelSchema } from "../models/fileModel";

export const filesRoute = new Hono()

    .get("/list", async (c) => {
        const files = await fs.promises.readdir("./files");
        const filesData = await Promise.all(
            files.map(async (file) => {
                const stats = await fs.promises.stat(`./files/${file}`);
                const fileData = FileModelSchema.parse({
                    name: file,
                    creationDate: stats.birthtime,
                    lastModifiedDate: stats.mtime,
                    size: stats.size,
                });
                return fileData;
            })
        );
        return c.json({ files: filesData });
    })

    .get("/:file/download", async (c) => {
        const file = c.req.param("file");

        if (!file) {
            return c.json({ message: "No file provided!" }, 400);
        }

        if (typeof file !== 'string') {
            return c.json({ message: "Invalid file name!" }, 400);
        }

        const filePath = `./files/${file}`;
        try {
            const fileData = await fs.promises.readFile(filePath);
            const arrayBuffer = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
            const buffer = Buffer.from(arrayBuffer);
            const stream = require('stream');
            const readableStream = new stream.Readable();
            readableStream.push(buffer);
            readableStream.push(null);
            c.res.headers.append("Content-Disposition", `attachment; filename=${file}`);
            c.res.headers.append("Content-Type", "application/octet-stream");
            return c.body(readableStream);
        } catch (err) {
            return c.json({ message: "File not found!" }, 404);
        }
    })

    .post("/", async (c) => {
        const body = await c.req.parseBody();
        const file = body['file'] as File;

        if (!file) {
            return c.json({ message: "No file provided!" }, 400);
        }

        if (!file.name) {
            return c.json({ message: "File must have a name!" }, 400);
        }

        const originalName = path.basename(file.name, path.extname(file.name));
        const fileExtension = path.extname(file.name);
        let filePath = `./files/${originalName}${fileExtension}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        let i = 1;
        while (fs.existsSync(filePath)) {
            filePath = `./files/${originalName}(${i})${fileExtension}`;
            i++;
        }

        try {
            fs.writeFileSync(filePath, buffer);
        } catch (err) {
            return c.json({ message: "Error saving file!" }, 500);
        }

        const stats = fs.statSync(filePath);

        return c.json({
            message: "File saved successfully!",
            file: {
                name: file.name,
                size: stats.size,
                lastModifiedDate: stats.mtime.toISOString(),
                path: filePath
            }
        });
    })

    .delete("/:file/delete", async (c) => {
        const file = c.req.param("file");

        if (!file) {
            return c.json({ message: "No file provided!" }, 400);
        }

        if (typeof file !== 'string') {
            return c.json({ message: "Invalid file name!" }, 400);
        }

        const filePath = `./files/${file}`;
        try {
            await fs.promises.unlink(filePath);
            return c.json({ message: "File deleted successfully!" });
        } catch (err) {
            return c.json({ message: "File not found!" }, 404);
        }
    })

    .put("/:file/rename", async (c) => {
        const file = c.req.param("file");
        const newName = await c.req.text();

        if (!file) {
            return c.json({ message: "No file provided!" }, 400);
        }

        if (typeof file !== 'string') {
            return c.json({ message: "Invalid file name!" }, 400);
        }

        if (!newName) {
            return c.json({ message: "No new name provided!" }, 400);
        }

        if (typeof newName !== 'string') {
            return c.json({ message: "Invalid new name!" }, 400);
        }

        const fileExtension = path.extname(file);
        const filePath = `./files/${file}`;
        const newFilePath = `./files/${newName}${fileExtension}`;

        try {
            await fs.promises.rename(filePath, newFilePath);
            return c.json({ message: "File renamed successfully!", newName: newName+fileExtension });
        } catch (err) {
            return c.json({ message: "File not found!" }, 404);
        }
    });

