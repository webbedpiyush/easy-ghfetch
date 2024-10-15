#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const extra_typings_1 = require("@commander-js/extra-typings");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function useGitHubUrl(url) {
    var _a;
    const urlPieces = url.split("/");
    const user = urlPieces[3];
    const repo = urlPieces[4];
    const branch = (_a = urlPieces[6]) !== null && _a !== void 0 ? _a : "main";
    const folderpath = urlPieces.slice(7).join("/");
    return { user, repo, branch, folderpath };
}
function fetchRepoDetails(user, repo, branch, folderpath) {
    return __awaiter(this, void 0, void 0, function* () {
        const githubApi = `https://api.github.com/repos/${user}/${repo}/git/trees/${branch}?recursive=1`;
        const response = yield axios_1.default.get(githubApi);
        return response.data.tree.filter((data) => data.path.startsWith(folderpath));
    });
}
function fetchingFolder(user, repo, branch, filepath, resultPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filepath}`;
        const response = yield axios_1.default.get(url, { responseType: "arraybuffer" });
        fs_1.default.mkdirSync(path_1.default.dirname(resultPath), { recursive: true });
        fs_1.default.writeFileSync(resultPath, Buffer.from(response.data));
    });
}
const program = new extra_typings_1.Command();
program
    .version("1.0.0")
    .description("Fetch specific folders from any branch of Github repositories")
    .argument("<url>", "Github URL of the folder to clone")
    .option("-o, --output <directory>", "Output directory", process.cwd())
    .action((url, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user, repo, branch, folderpath } = useGitHubUrl(url);
        console.log(`Fetching ${folderpath} from ${user}/${repo} (${branch}....)`);
        const details = yield fetchRepoDetails(user, repo, branch, folderpath);
        for (const object of details) {
            if (object.type === "blob") {
                // ye relativePath tak ke liye jab user saari files ka path na bataye ya sirf folder ka
                const relativePath = object.path.substring(folderpath.length);
                const resultPath = path_1.default.join(options.output, relativePath);
                console.log(`Fetching: ${relativePath}`);
                yield fetchingFolder(user, repo, branch, object.path, resultPath);
            }
        }
    }
    catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}));
program.parse(process.argv);
