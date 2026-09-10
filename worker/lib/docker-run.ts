import { spawn } from "child_process";

export interface DockerRunOptions {
  image: string;
  args: string[];
  mounts?: { hostPath: string; containerPath: string; readOnly?: boolean }[];
  network?: "none" | "bridge";
  timeoutMs?: number;
}

export interface DockerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Runs one scan tool as an isolated, auto-removed Docker container — never
 * on the host directly. `--network none` for repo scans (no reason a static
 * analyzer needs egress); site scans override it since they must reach the
 * target.
 */
export function dockerRun({
  image,
  args,
  mounts = [],
  network = "none",
  timeoutMs = 5 * 60 * 1000,
}: DockerRunOptions): Promise<DockerRunResult> {
  const dockerArgs = [
    "run",
    "--rm",
    "--network",
    network,
    "--memory",
    "1g",
    "--cpus",
    "1",
    ...mounts.flatMap((m) => [
      "-v",
      `${m.hostPath}:${m.containerPath}${m.readOnly ? ":ro" : ""}`,
    ]),
    image,
    ...args,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn("docker", dockerArgs);
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`docker run timed out after ${timeoutMs}ms (image: ${image})`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode });
    });
  });
}
