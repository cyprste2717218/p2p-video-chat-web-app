import { useRef } from "react";

type WorkerRequest =
  | { type: "ReqLogin"; body: object }
  | { type: "ReqSignup"; body: object }
  | { type: "ReqLogout"; body?: undefined }
  | { type: "ReqCreateCall"; body?: undefined }
  | { type: "ReqJoinCall"; body: string }
  | { type: "ReqLeaveCall"; body?: undefined };

function ask(worker: Worker, reqType: string, resType: string, body?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === resType) {
        worker.removeEventListener("message", handler);
        resolve(event.data.message);
      } else {
        worker.removeEventListener("message", handler);
        reject(new Error(`Unexpected response type: ${event.data.type}`));
      }
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ messageType: reqType, requestBody: body });
  });
}

export function useTokenWorker() {
  const workerRef = useRef<Worker | null>(null);

  function getWorker(): Worker {
    if (!workerRef.current) {
      workerRef.current = new Worker("/token-worker.js", { type: "module" });
    }
    return workerRef.current;
  }

  async function login(email: string, password: string): Promise<string> {
    const result = await ask(getWorker(), "ReqLogin", "ResLogin", { email, password });
    return result as string;
  }

  async function register(username: string, email: string, password: string): Promise<string> {
    const result = await ask(getWorker(), "ReqSignup", "ResSignup", { username, email, password });
    return result as string;
  }

  async function logout(): Promise<string> {
    const result = await ask(getWorker(), "ReqLogout", "ResLogout");
    return result as string;
  }

  async function createCall(): Promise<{ callID: string; callURL: string }> {
    const result = await ask(getWorker(), "ReqCreateCall", "ResCreateCall");
    return result as { callID: string; callURL: string };
  }

  async function joinCall(callID: string): Promise<string> {
    const result = await ask(getWorker(), "ReqJoinCall", "ResJoinCall", callID);
    return result as string;
  }

  return { login, register, logout, createCall, joinCall };
}
