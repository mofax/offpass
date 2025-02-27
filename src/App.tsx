import './index.css';
import { PasswordManagerProvider } from './lib/context';
import PasswordManager from './components/PasswordManager';

export function App() {
	return (
		<PasswordManagerProvider>
			<PasswordManager />
		</PasswordManagerProvider>
	);
}

export default App;
