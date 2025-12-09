import { Routes, Route, Link } from 'react-router-dom';
import { TestView } from './views/TestView/TestView';
import { PlayerView } from './views/PlayerView/PlayerView';
import { HostView } from './views/HostView/HostView';
import { BoardView } from './views/BoardView/BoardView';
import { GameLobby } from './views/GameLobby/GameLobby';
import { GameBrowser } from './views/GameBrowser/GameBrowser';

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', minHeight: '100vh', backgroundColor: '#2c3e50' }}>
      <h1 style={{ color: 'white', fontSize: '3rem', marginBottom: '2rem', fontFamily: 'Impact, sans-serif' }}>
        JEOPARDY! Game System
      </h1>
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <Link
          to="/lobby"
          style={{
            fontSize: '1.5rem',
            padding: '1.5rem 2rem',
            background: 'linear-gradient(135deg, #f39c12, #e67e22)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: '3px solid black',
            fontWeight: 'bold',
            width: '100%',
            display: 'block',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          🎮 CREATE NEW GAME
        </Link>
        <Link
          to="/browse"
          style={{
            fontSize: '1.5rem',
            padding: '1.5rem 2rem',
            background: 'linear-gradient(135deg, #27ae60, #229954)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: '3px solid black',
            fontWeight: 'bold',
            width: '100%',
            display: 'block',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          🔍 BROWSE GAMES
        </Link>
        <Link
          to="/test"
          style={{
            fontSize: '1.2rem',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #3498db, #2980b9)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: '3px solid black',
            fontWeight: 'bold',
            width: '100%',
            display: 'block'
          }}
        >
          Test View (Board Components)
        </Link>
        <Link
          to="/host/12345678-1234-1234-1234-123456789abc"
          style={{
            fontSize: '1.2rem',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #27ae60, #229954)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: '3px solid black',
            fontWeight: 'bold',
            width: '100%',
            display: 'block'
          }}
        >
          Host Interface (Test Game)
        </Link>
        <Link
          to="/player/12345678-1234-1234-1234-123456789abc/Alice/1"
          style={{
            fontSize: '1.2rem',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: '3px solid black',
            fontWeight: 'bold',
            width: '100%',
            display: 'block'
          }}
        >
          Player 1 Interface (Test Game)
        </Link>
        <Link
          to="/board/12345678-1234-1234-1234-123456789abc"
          style={{
            fontSize: '1.2rem',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            border: '3px solid black',
            fontWeight: 'bold',
            width: '100%',
            display: 'block'
          }}
        >
          Board View (Test Game)
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lobby" element={<GameLobby />} />
      <Route path="/browse" element={<GameBrowser />} />
      <Route path="/test" element={<TestView />} />
      <Route path="/host/:gameId" element={<HostView />} />
      <Route path="/player/:gameId/:playerName/:playerNumber" element={<PlayerView />} />
      <Route path="/player/:gameId" element={<PlayerView />} />
      <Route path="/board/:gameId" element={<BoardView />} />
    </Routes>
  );
}

export default App;
