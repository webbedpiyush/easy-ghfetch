#!/usr/bin/env node
import { Command } from "@commander-js/extra-typings";
import axios from "axios";
import fs from "fs";
import path from "path";

interface githubDetails {
  user: string;
  repo: string;
  branch: string;
  folderpath: string;
}

function useGitHubUrl(url: string): githubDetails {
  const urlPieces = url.split("/");
  const user = urlPieces[3];
  const repo = urlPieces[4];
  const branch = urlPieces[6] ?? "main";
  const folderpath = urlPieces.slice(7).join("/");

  return { user, repo, branch, folderpath };
}

async function fetchRepoDetails(
  user: string,
  repo: string,
  branch: string,
  folderpath: string
): Promise<any> {
  const githubApi = `https://api.github.com/repos/${user}/${repo}/git/trees/${branch}?recursive=1`;
  const response = await axios.get(githubApi);
  return response.data.tree.filter((data: any) =>
    data.path.startsWith(folderpath)
  );
}

async function fetchingFolder(
  user: string,
  repo: string,
  branch: string,
  filepath: string,
  resultPath: string
) {
  const url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filepath}`;
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, Buffer.from(response.data));
}

const program = new Command();

program
  .version("1.0.0")
  .description("Fetch specific folders from any branch of Github repositories")
  .argument("<url>", "Github URL of the folder to clone")
  .option("-o, --output <directory>", "Output directory", process.cwd())
  .action(async (url, options) => {
    try {
      const { user, repo, branch, folderpath } = useGitHubUrl(url);
      console.log(
        `Fetching ${folderpath} from ${user}/${repo} (${branch}....)`
      );

      const details = await fetchRepoDetails(user, repo, branch, folderpath);

      for (const object of details) {
        if (object.type === "blob") {
          // ye relativePath tak ke liye jab user saari files ka path na bataye ya sirf folder ka
          const relativePath = object.path.substring(folderpath.length);
          const resultPath = path.join(options.output, relativePath);

          console.log(`Fetching: ${relativePath}`);
          await fetchingFolder(user, repo, branch, object.path, resultPath);
        }
      }
    } catch (err: any) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
