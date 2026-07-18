import React, {useState} from 'react';
import AuthScreen from '@/components/auth-screen.tsx';
import CallScreen from '@/components/call-screen.tsx';

export default function App() {
	const [user, setUser] = useState<
		{email: string; username: string} | undefined
	>(undefined);

	if (!user) {
		return (
			<AuthScreen
				onAuthenticated={(email, username) => {
					setUser({email, username});
				}}
			/>
		);
	}

	return (
		<CallScreen
			email={user.email}
			username={user.username}
			onLogout={() => {
				setUser(undefined);
			}}
		/>
	);
}
