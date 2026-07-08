import React,{useState} from "react";
import AuthScreen from "@/components/AuthScreen";
import CallScreen from "@/components/CallScreen";

export default function App() {
  const [user,setUser]=useState<{email: string; username: string}|null>(null);

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={(email,username) => setUser({email,username})}
      />
    );
  }

  return (
    <CallScreen
      email={user.email}
      username={user.username}
      onLogout={() => setUser(null)}
    />
  );
}
