/**
 * Code Execution Tool — Sandboxed JS
 *
 * Runs JavaScript code in a child process with a 30-second timeout.
 * Captures stdout/stderr and exit code.
 */

import { execFile } from 'node:child_process'

const TIMEOUT_MS = 30_000

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function codeExec(code: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      ['--eval', code],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB
        env: {}, // empty env — sandboxed
        cwd: '/tmp',
      },
      (error, stdout, stderr) => {
        if (error && 'killed' in error && error.killed) {
          resolve({
            stdout: String(stdout),
            stderr: 'Execution timed out after 30 seconds',
            exitCode: 124,
          })
          return
        }

        resolve({
          stdout: String(stdout),
          stderr: String(stderr),
          exitCode: error?.code != null ? (typeof error.code === 'number' ? error.code : 1) : 0,
        })
      },
    )

    // Safety: kill if still running after timeout + 1s buffer
    setTimeout(() => {
      child.kill('SIGKILL')
    }, TIMEOUT_MS + 1_000)
  })
}
