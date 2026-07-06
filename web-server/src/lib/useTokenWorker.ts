let workerInstance: Worker|null=null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance=new Worker("/token-worker.js",{type: "module"});
    workerInstance.postMessage({messageType: "Init",apiBase: import.meta.env.PUBLIC_API_ORIGIN});
  }
  return workerInstance;
}

function ask(reqType: string,resType: string,body?: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    const worker=getWorker();
    const handler=(event: MessageEvent) => {
      if (event.data.type===resType) {
        worker.removeEventListener("message",handler);
        resolve(event.data.message);
      }
    };
    worker.addEventListener("message",handler);
    worker.postMessage({messageType: reqType,requestBody: body});
  });
}

export function useTokenWorker() {
  async function login(email: string,password: string): Promise<string> {
    return ask("ReqLogin","ResLogin",{email,password}) as Promise<string>;
  }

  async function register(username: string,email: string,password: string): Promise<string> {
    return ask("ReqSignup","ResSignup",{username,email,password}) as Promise<string>;
  }

  async function logout(): Promise<string> {
    return ask("ReqLogout","ResLogout") as Promise<string>;
  }

  async function createCall(): Promise<{callID: string; callURL: string}> {
    return ask("ReqCreateCall","ResCreateCall") as Promise<{callID: string; callURL: string}>;
  }

  async function joinCall(callID: string): Promise<string> {
    return ask("ReqJoinCall","ResJoinCall",callID) as Promise<string>;
  }

  return {login,register,logout,createCall,joinCall};
}
