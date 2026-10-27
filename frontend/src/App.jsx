import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from './stores/auth';
import api from './api';

function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const { login, register, loading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegister) {
      await register(username, email, password);
    } else {
      await login(username, password);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#36393f', color: '#fff' }}>
      <form onSubmit={handleSubmit} style={{ background: '#2f3136', padding: 40, borderRadius: 8, width: 400 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Quetzalcoatl</h1>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
        {error && <div style={{ color: '#f04747', marginBottom: 10, textAlign: 'center' }}>{error}</div>}
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 4, border: 'none', background: '#202225', color: '#fff' }} />
        {isRegister && <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 4, border: 'none', background: '#202225', color: '#fff' }} />}
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 20, borderRadius: 4, border: 'none', background: '#202225', color: '#fff' }} />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, borderRadius: 4, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Loading...' : (isRegister ? 'Register' : 'Login')}
        </button>
        <div style={{ textAlign: 'center', marginTop: 15, color: '#b9bbbe', cursor: 'pointer' }} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </div>
      </form>
    </div>
  );
}

function ServerList({ servers, selectedServer, onSelect, onCreate }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  return (
    <div style={{ width: 72, background: '#202225', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, overflowY: 'auto', position: 'relative' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: 20 }} onClick={() => onSelect(null)}>
        Q
      </div>
      <div style={{ width: 32, height: 2, background: '#36393f', borderRadius: 1 }} />
      {servers.map((s) => (
        <div key={s.id} onClick={() => onSelect(s)} style={{ width: 48, height: 48, borderRadius: selectedServer?.id === s.id ? '16px' : '50%', background: '#36393f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, color: '#fff', transition: 'border-radius 0.2s' }} title={s.name}>
          {s.name.charAt(0).toUpperCase()}
        </div>
      ))}
      <div onClick={() => setShowCreate(!showCreate)} style={{ width: 48, height: 48, borderRadius: '50%', background: '#36393f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 24, color: '#3ba55c' }}>
        +
      </div>
      {showCreate && (
        <div style={{ position: 'absolute', left: 80, top: 100, background: '#2f3136', padding: 15, borderRadius: 8, zIndex: 10 }}>
          <input placeholder="Server name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} style={{ padding: 8, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', marginBottom: 8, width: 150 }} />
          <button onClick={handleCreate} style={{ width: '100%', padding: 8, borderRadius: 4, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer' }}>Create</button>
        </div>
      )}
    </div>
  );
}

function ChannelList({ server, channels, selectedChannel, onSelect }) {
  if (!server) return <div style={{ width: 240, background: '#2f3136', padding: 16, color: '#fff' }}><div style={{ color: '#b9bbbe', textAlign: 'center', marginTop: 50 }}>Select a server</div></div>;

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <div style={{ width: 240, background: '#2f3136', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #202225', fontWeight: 'bold', color: '#fff' }}>{server.name}</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {textChannels.length > 0 && (
          <>
            <div style={{ color: '#8e9297', fontSize: 12, fontWeight: 'bold', padding: '8px 8px 4px', textTransform: 'uppercase' }}>Text Channels</div>
            {textChannels.map((c) => (
              <div key={c.id} onClick={() => onSelect(c)} style={{ padding: '6px 8px', borderRadius: 4, cursor: 'pointer', color: selectedChannel?.id === c.id ? '#fff' : '#8e9297', background: selectedChannel?.id === c.id ? '#393c43' : 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>#</span> {c.name}
              </div>
            ))}
          </>
        )}
        {voiceChannels.length > 0 && (
          <>
            <div style={{ color: '#8e9297', fontSize: 12, fontWeight: 'bold', padding: '8px 8px 4px', textTransform: 'uppercase', marginTop: 8 }}>Voice Channels</div>
            {voiceChannels.map((c) => (
              <div key={c.id} style={{ padding: '6px 8px', borderRadius: 4, color: '#8e9297', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>&#128266;</span> {c.name}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MessageView({ channel, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!channel) return;
    setMessages([]);
    api.getMessages(channel.id).then(setMessages).catch(console.error);

    const token = localStorage.getItem('quetzalcoatl_token');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = window.location.host || 'localhost:8000';
const socket = new WebSocket(`${wsProtocol}//${wsHost}/ws?token=${token}`);
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'subscribe', channel_id: channel.id }));
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message' && data.channel_id === channel.id) {
        setMessages((prev) => [...prev, data]);
      }
    };
    setWs(socket);
    return () => socket.close();
  }, [channel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'message', channel_id: channel.id, content: input.trim() }));
    } else {
      await api.sendMessage(channel.id, { content: input.trim() });
      const msgs = await api.getMessages(channel.id);
      setMessages(msgs);
    }
    setInput('');
  };

  if (!channel) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e9297', background: '#36393f' }}>Select a channel</div>;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#36393f' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #202225', color: '#fff', fontWeight: 'bold' }}>
        # {channel.name}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
              {(m.author_display_name || m.author_username).charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{m.author_display_name || m.author_username}</span>
                <span style={{ color: '#8e9297', fontSize: 12 }}>{new Date(m.created_at).toLocaleTimeString()}</span>
                {m.is_edited && <span style={{ color: '#8e9297', fontSize: 10 }}>(edited)</span>}
              </div>
              <div style={{ color: '#dcddde', marginTop: 2, whiteSpace: 'pre-wrap' }}>{m.content}</div>
              {m.reactions && m.reactions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {m.reactions.map((r) => (
                    <span key={r.emoji} style={{ background: '#2f3136', padding: '2px 6px', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
                      {r.emoji} {r.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid #202225' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message #${channel.name}`} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', background: '#40444b', color: '#fff', fontSize: 14 }} />
      </form>
    </div>
  );
}

export default function App() {
  const { user, init, logout } = useAuthStore();
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!user) return;
    api.listServers().then(setServers).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!selectedServer) { setChannels([]); setSelectedChannel(null); return; }
    api.listChannels(selectedServer.id).then(setChannels).catch(console.error);
  }, [selectedServer]);

  const handleCreateServer = async (name) => {
    const server = await api.createServer({ name });
    setServers((prev) => [...prev, server]);
    setSelectedServer(server);
  };

  if (!user) return <LoginScreen />;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <ServerList servers={servers} selectedServer={selectedServer} onSelect={setSelectedServer} onCreate={handleCreateServer} />
      <ChannelList server={selectedServer} channels={channels} selectedChannel={selectedChannel} onSelect={setSelectedChannel} />
      <MessageView channel={selectedChannel} user={user} />
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <button onClick={logout} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#f04747', color: '#fff', cursor: 'pointer' }}>Logout</button>
      </div>
    </div>
  );
}
