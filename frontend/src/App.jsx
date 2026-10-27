import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from './stores/auth';
import api from './api';

const isMobile = () => window.innerWidth < 768;

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#36393f', color: '#fff', padding: 20, boxSizing: 'border-box' }}>
      <form onSubmit={handleSubmit} style={{ background: '#2f3136', padding: 30, borderRadius: 8, width: '100%', maxWidth: 400 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Quetzalcoatl</h1>
        <h2 style={{ textAlign: 'center', marginBottom: 20, fontSize: 18 }}>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
        {error && <div style={{ color: '#f04747', marginBottom: 10, textAlign: 'center' }}>{error}</div>}
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 10, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', fontSize: 16, boxSizing: 'border-box' }} />
        {isRegister && <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 10, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', fontSize: 16, boxSizing: 'border-box' }} />}
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 20, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', fontSize: 16, boxSizing: 'border-box' }} />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 4, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>
          {loading ? 'Loading...' : (isRegister ? 'Register' : 'Login')}
        </button>
        <div style={{ textAlign: 'center', marginTop: 15, color: '#b9bbbe', cursor: 'pointer', padding: 10 }} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </div>
      </form>
    </div>
  );
}

function ServerList({ servers, selectedServer, onSelect, onCreate, onJoin }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const mobile = isMobile();

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    if (!inviteCode.trim()) return;
    await onJoin(inviteCode.trim());
    setInviteCode('');
    setShowJoin(false);
  };

  if (mobile) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#202225', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 8, overflowY: 'auto', boxSizing: 'border-box' }}>
        <button onClick={() => onSelect(null)} style={{ width: 48, height: 48, borderRadius: '50%', background: '#5865f2', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 20, color: '#fff' }}>Q</button>
        <div style={{ width: 32, height: 2, background: '#36393f', borderRadius: 1 }} />
        {servers.map((s) => (
          <button key={s.id} onClick={() => onSelect(s)} style={{ width: 48, height: 48, borderRadius: selectedServer?.id === s.id ? '16px' : '50%', background: '#36393f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, color: '#fff' }} title={s.name}>
            {s.name.charAt(0).toUpperCase()}
          </button>
        ))}
        <button onClick={() => setShowCreate(!showCreate)} style={{ width: 48, height: 48, borderRadius: '50%', background: '#36393f', border: 'none', cursor: 'pointer', fontSize: 24, color: '#3ba55c' }}>+</button>
        <button onClick={() => setShowJoin(!showJoin)} style={{ width: 48, height: 48, borderRadius: '50%', background: '#36393f', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5865f2' }}>→</button>
        {showCreate && (
          <div style={{ position: 'fixed', left: 10, top: 60, background: '#2f3136', padding: 15, borderRadius: 8, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            <input placeholder="Server name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(e); }} style={{ padding: 10, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', marginBottom: 8, width: 150, fontSize: 16, boxSizing: 'border-box' }} />
            <button onClick={(e) => handleCreate(e)} style={{ width: '100%', padding: 10, borderRadius: 4, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontSize: 16 }}>Create</button>
          </div>
        )}
        {showJoin && (
          <div style={{ position: 'fixed', left: 10, top: 60, background: '#2f3136', padding: 15, borderRadius: 8, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            <input placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(e); }} style={{ padding: 10, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', marginBottom: 8, width: 150, fontSize: 16, boxSizing: 'border-box' }} />
            <button onClick={(e) => handleJoin(e)} style={{ width: '100%', padding: 10, borderRadius: 4, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontSize: 16 }}>Join</button>
          </div>
        )}
      </div>
    );
  }

  // Desktop
  return (
    <div style={{ width: 220, height: '100%', background: '#202225', display: 'flex', flexDirection: 'column', padding: '12px 0', gap: 4, overflowY: 'auto', boxSizing: 'border-box', borderRight: '1px solid #1a1a1a' }}>
      <button onClick={() => onSelect(null)} style={{ margin: '0 12px 8px', padding: '10px 12px', borderRadius: 8, background: '#5865f2', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, color: '#fff', textAlign: 'center' }}>Home</button>
      <div style={{ height: 1, background: '#36393f', margin: '4px 12px' }} />
      {servers.map((s) => (
        <button key={s.id} onClick={() => onSelect(s)} style={{ margin: '2px 12px', padding: '10px 12px', borderRadius: 8, background: selectedServer?.id === s.id ? '#393c43' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, color: '#fff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.name}>
          {s.name}
        </button>
      ))}
      <div style={{ height: 1, background: '#36393f', margin: '4px 12px' }} />
      <button onClick={() => setShowCreate(!showCreate)} style={{ margin: '2px 12px', padding: '10px 12px', borderRadius: 8, background: 'transparent', border: '1px dashed #3ba55c', cursor: 'pointer', fontSize: 14, color: '#3ba55c', textAlign: 'center' }}>+ New Server</button>
      <button onClick={() => setShowJoin(!showJoin)} style={{ margin: '2px 12px', padding: '10px 12px', borderRadius: 8, background: 'transparent', border: '1px dashed #5865f2', cursor: 'pointer', fontSize: 14, color: '#5865f2', textAlign: 'center' }}>→ Join Server</button>
      {showCreate && (
        <div style={{ margin: '8px 12px', background: '#2f3136', padding: 12, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <input placeholder="Server name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(e); }} style={{ padding: 8, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', marginBottom: 8, width: '100%', fontSize: 14, boxSizing: 'border-box' }} />
          <button onClick={(e) => handleCreate(e)} style={{ width: '100%', padding: 8, borderRadius: 4, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontSize: 14 }}>Create</button>
        </div>
      )}
      {showJoin && (
        <div style={{ margin: '8px 12px', background: '#2f3136', padding: 12, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <input placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(e); }} style={{ padding: 8, borderRadius: 4, border: 'none', background: '#202225', color: '#fff', marginBottom: 8, width: '100%', fontSize: 14, boxSizing: 'border-box' }} />
          <button onClick={(e) => handleJoin(e)} style={{ width: '100%', padding: 8, borderRadius: 4, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontSize: 14 }}>Join</button>
        </div>
      )}
    </div>
  );
}

function ChannelList({ server, channels, selectedChannel, onSelect, onBack, conversations = [], selectedConv = null, onSelectConv, onNewDM, user }) {
  if (!server && !conversations.length) {
    return (
      <div style={{ width: 260, height: '100%', background: '#2f3136', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e9297', fontSize: 14, boxSizing: 'border-box', borderRight: '1px solid #1a1a1a' }}>
        Select a server or start a DM
      </div>
    );
  }

  const mobile = isMobile();
  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  const convName = (conv) => {
    if (conv.is_group) return conv.name || 'Group DM';
    const other = conv.participants.find(p => p.id !== user?.id);
    return other ? (other.display_name || other.username) : 'DM';
  };

  if (mobile) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#2f3136', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #202225', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{server ? server.name : 'Direct Messages'}</span>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b9bbbe', fontSize: 20, padding: 4 }}>←</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {server && (
            <>
              <div style={{ fontSize: 11, color: '#8e9297', padding: '8px 8px 4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Channels</div>
              {textChannels.map((c) => (
                <button key={c.id} onClick={() => onSelect(c)} style={{ display: 'block', width: '100%', padding: '10px 8px', borderRadius: 4, cursor: 'pointer', color: selectedChannel?.id === c.id ? '#fff' : '#8e9297', background: selectedChannel?.id === c.id ? '#393c43' : 'transparent', border: 'none', textAlign: 'left', fontSize: 14, minHeight: 44 }}>
                  # {c.name}
                </button>
              ))}
              {voiceChannels.map((c) => (
                <div key={c.id} style={{ padding: '10px 8px', color: '#8e9297', fontSize: 14, minHeight: 44 }}>🔊 {c.name}</div>
              ))}
            </>
          )}
          <div style={{ fontSize: 11, color: '#8e9297', padding: '8px 8px 4px', textTransform: 'uppercase', fontWeight: 'bold', marginTop: 8 }}>Direct Messages</div>
          {conversations.map((conv) => (
            <button key={conv.id} onClick={() => onSelectConv(conv)} style={{ display: 'block', width: '100%', padding: '10px 8px', borderRadius: 4, cursor: 'pointer', color: selectedConv?.id === conv.id ? '#fff' : '#8e9297', background: selectedConv?.id === conv.id ? '#393c43' : 'transparent', border: 'none', textAlign: 'left', fontSize: 14, minHeight: 44 }}>
              💬 {convName(conv)}
            </button>
          ))}
          <button onClick={onNewDM} style={{ display: 'block', width: '100%', padding: '10px 8px', borderRadius: 4, cursor: 'pointer', color: '#3ba55c', background: 'transparent', border: 'none', textAlign: 'left', fontSize: 14, minHeight: 44 }}>
            + New DM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 260, height: '100%', background: '#2f3136', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', borderRight: '1px solid #1a1a1a' }}>
      {server && (
        <>
          <div style={{ padding: 16, borderBottom: '1px solid #202225', fontWeight: 'bold', color: '#fff' }}>{server.name}</div>
          <div style={{ padding: '4px 16px 8px', fontSize: 12, color: '#8e9297', borderBottom: '1px solid #202225' }}>Invite: {server.invite_code}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            <div style={{ fontSize: 11, color: '#8e9297', padding: '8px 8px 4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Text Channels</div>
            {textChannels.map((c) => (
              <button key={c.id} onClick={() => onSelect(c)} style={{ display: 'block', width: '100%', padding: '8px', borderRadius: 4, cursor: 'pointer', color: selectedChannel?.id === c.id ? '#fff' : '#8e9297', background: selectedChannel?.id === c.id ? '#393c43' : 'transparent', border: 'none', textAlign: 'left', fontSize: 14 }}>
                # {c.name}
              </button>
            ))}
            {voiceChannels.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#8e9297', padding: '8px 8px 4px', textTransform: 'uppercase', fontWeight: 'bold', marginTop: 8 }}>Voice Channels</div>
                {voiceChannels.map((c) => (
                  <div key={c.id} style={{ padding: '8px', color: '#8e9297', fontSize: 14 }}>🔊 {c.name}</div>
                ))}
              </>
            )}
          </div>
        </>
      )}
      {!server && (
        <div style={{ padding: 16, color: '#8e9297', fontSize: 14 }}>Select a server to see channels</div>
      )}
      <div style={{ borderTop: '1px solid #202225', padding: 8 }}>
        <div style={{ fontSize: 11, color: '#8e9297', padding: '4px 8px', textTransform: 'uppercase', fontWeight: 'bold' }}>Direct Messages</div>
        {conversations.map((conv) => (
          <button key={conv.id} onClick={() => onSelectConv(conv)} style={{ display: 'block', width: '100%', padding: '8px', borderRadius: 4, cursor: 'pointer', color: selectedConv?.id === conv.id ? '#fff' : '#8e9297', background: selectedConv?.id === conv.id ? '#393c43' : 'transparent', border: 'none', textAlign: 'left', fontSize: 14 }}>
            💬 {convName(conv)}
          </button>
        ))}
        <button onClick={onNewDM} style={{ display: 'block', width: '100%', padding: '8px', borderRadius: 4, cursor: 'pointer', color: '#3ba55c', background: 'transparent', border: 'none', textAlign: 'left', fontSize: 14 }}>
          + New DM
        </button>
      </div>
    </div>
  );
}
function DMView({ conversation, user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const mobile = isMobile();

  useEffect(() => {
    if (!conversation) return;
    setMessages([]);
    api.getDMMessages(conversation.id).then(setMessages).catch(console.error);
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      const msg = await api.sendDM(conversation.id, { content: input.trim() });
      setMessages((prev) => [...prev, msg]);
      setInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const convName = () => {
    if (!conversation) return 'DM';
    if (conversation.is_group) return conversation.name || 'Group DM';
    const other = conversation.participants.find(p => p.id !== user.id);
    return other ? (other.display_name || other.username) : 'DM';
  };

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e9297', background: '#36393f', fontSize: 14 }}>
        Select a conversation
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#36393f', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #202225', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
        {mobile && <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b9bbbe', fontSize: 20, padding: 4 }}>←</button>}
        💬 {convName()}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m) => {
          const isBot = m.author_username === 'narusya' || m.is_bot;
          return (
            <div key={m.id} style={{ marginBottom: 12, display: 'flex', gap: 12, background: isBot ? 'rgba(88,101,242,0.08)' : 'transparent', borderRadius: 8, padding: isBot ? 8 : 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isBot ? '#7289da' : '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0, fontSize: isBot ? 18 : 14 }}>
                {isBot ? '🐍' : (m.author_display_name || m.author_username || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: isBot ? '#7289da' : '#fff', fontWeight: 'bold' }}>{m.author_display_name || m.author_username}</span>
                  {isBot && <span style={{ background: '#5865f2', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 'bold' }}>BOT</span>}
                  <span style={{ color: '#8e9297', fontSize: 12 }}>{new Date(m.created_at).toLocaleTimeString()}</span>
                </div>
                <div style={{ color: '#dcddde', marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                {m.attachments && m.attachments.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {m.attachments.map((a) => (
                      a.content_type && a.content_type.startsWith('image/') ? (
                        <a key={a.id} href={a.url.startsWith('http') ? a.url : `${window.location.origin}${a.url}`} target="_blank" rel="noopener noreferrer">
                          <img src={a.url.startsWith('http') ? a.url : `${window.location.origin}${a.url}`} alt={a.filename} style={{ maxWidth: 300, maxHeight: 200, borderRadius: 8, cursor: 'pointer' }} />
                        </a>
                      ) : (
                        <a key={a.id} href={a.url.startsWith('http') ? a.url : `${window.location.origin}${a.url}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#2f3136', borderRadius: 8, color: '#00aff4', textDecoration: 'none', fontSize: 13 }}>
                          📎 {a.filename} ({Math.round(a.size / 1024)}KB)
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid #202225', display: 'flex', gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message ${convName()}`} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#40444b', color: '#fff', fontSize: 16, boxSizing: 'border-box' }} />
        <button type="submit" style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>Send</button>
      </form>
    </div>
  );
}

function MessageView({ channel, user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const mobile = isMobile();

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
    socket.onerror = (err) => console.error('WebSocket error:', err);
    socket.onclose = (event) => {
      if (event.code !== 1000) console.warn('WebSocket closed:', event.code, event.reason);
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

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !channel) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('quetzalcoatl_token');
      const res = await fetch(`/api/channels/${channel.id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploaded = await res.json();
      await api.sendMessage(channel.id, { content: input.trim() || file.name, attachments: [uploaded] });
      const msgs = await api.getMessages(channel.id);
      setMessages(msgs);
      setInput('');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!channel) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e9297', background: '#36393f', fontSize: 14 }}>
        Select a channel to start chatting
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#36393f', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #202225', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
        {mobile && <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b9bbbe', fontSize: 20, padding: 4 }}>←</button>}
        # {channel.name}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m) => {
          const isBot = m.author_username === 'narusya' || m.is_bot;
          return (
            <div key={m.id} style={{ marginBottom: 12, display: 'flex', gap: 12, background: isBot ? 'rgba(88,101,242,0.08)' : 'transparent', borderRadius: 8, padding: isBot ? 8 : 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isBot ? '#7289da' : '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0, fontSize: isBot ? 18 : 14 }}>
                {isBot ? '🐍' : (m.author_display_name || m.author_username || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: isBot ? '#7289da' : '#fff', fontWeight: 'bold' }}>{m.author_display_name || m.author_username}</span>
                  {isBot && <span style={{ background: '#5865f2', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 'bold' }}>BOT</span>}
                  <span style={{ color: '#8e9297', fontSize: 12 }}>{new Date(m.created_at).toLocaleTimeString()}</span>
                  {m.is_edited && <span style={{ color: '#8e9297', fontSize: 10 }}>(edited)</span>}
                </div>
                <div style={{ color: '#dcddde', marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {(m.content || '').split(/(@\w+)/g).map((part, i) =>
                    part.startsWith('@') ? <span key={i} style={{ background: 'rgba(88,101,242,0.3)', color: '#dee0fc', borderRadius: 3, padding: '0 2px' }}>{part}</span> : part
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid #202225', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#2f3136', color: '#b9bbbe', cursor: 'pointer', fontSize: 18 }} title="Attach file">
          {uploading ? '⏳' : '📎'}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message #${channel.name}`} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#40444b', color: '#fff', fontSize: 16, boxSizing: 'border-box' }} />
        <button type="submit" style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#5865f2', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>Send</button>
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
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [dmMode, setDmMode] = useState(false);
  const [mobileView, setMobileView] = useState('servers');
  const [joinError, setJoinError] = useState(null);
  const mobile = isMobile();

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!user) return;
    api.listServers().then(setServers).catch(console.error);
    api.listConversations().then(setConversations).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!selectedServer) { setChannels([]); setSelectedChannel(null); return; }
    api.listChannels(selectedServer.id).then(setChannels).catch(console.error);
    if (mobile) setMobileView('channels');
  }, [selectedServer]);

  const handleCreateServer = async (name) => {
    const server = await api.createServer({ name });
    setServers((prev) => [...prev, server]);
    setSelectedServer(server);
  };

  const handleJoinServer = async (inviteCode) => {
    setJoinError(null);
    try {
      const server = await api.joinServer(inviteCode);
      const updated = await api.listServers();
      setServers(updated);
      setSelectedServer(server);
    } catch (e) {
      setJoinError(e.message);
    }
  };

  const handleSelectServer = (server) => {
    setSelectedServer(server);
    setSelectedChannel(null);
    setSelectedConv(null);
    setDmMode(false);
    if (mobile) setMobileView(server ? 'channels' : 'servers');
  };

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setSelectedConv(null);
    setDmMode(false);
    if (mobile) setMobileView('messages');
  };

  const handleSelectConv = (conv) => {
    setSelectedConv(conv);
    setSelectedChannel(null);
    setDmMode(true);
    if (mobile) setMobileView('messages');
  };

  const handleNewDM = async () => {
    const q = prompt('Search user to DM:');
    if (!q) return;
    try {
      const users = await api.searchUsers(q);
      if (users.length === 0) { alert('No users found'); return; }
      const u = users[0];
      const conv = await api.createConversation({ user_ids: [u.id] });
      setConversations((prev) => [conv, ...prev.filter(c => c.id !== conv.id)]);
      handleSelectConv(conv);
    } catch (e) {
      alert(e.message);
    }
  };

  if (!user) return <LoginScreen />;

  if (mobile) {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', overflow: 'hidden' }}>
        {mobileView === 'servers' && (
          <ServerList servers={servers} selectedServer={selectedServer} onSelect={handleSelectServer} onCreate={handleCreateServer} onJoin={handleJoinServer} />
        )}
        {mobileView === 'channels' && (
          <ChannelList server={selectedServer} channels={channels} selectedChannel={selectedChannel} onSelect={handleSelectChannel} onBack={() => setMobileView('servers')} conversations={conversations} selectedConv={selectedConv} onSelectConv={handleSelectConv} onNewDM={handleNewDM} user={user} />
        )}
        {mobileView === 'messages' && (
          dmMode ? <DMView conversation={selectedConv} user={user} onBack={() => setMobileView('channels')} /> : <MessageView channel={selectedChannel} user={user} onBack={() => setMobileView('channels')} />
        )}
        <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 20 }}>
          <button onClick={logout} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#f04747', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Logout</button>
        </div>
      </div>
    );
  }

  // Desktop: 3-column layout
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <ServerList servers={servers} selectedServer={selectedServer} onSelect={handleSelectServer} onCreate={handleCreateServer} onJoin={handleJoinServer} />
      <ChannelList server={selectedServer} channels={channels} selectedChannel={selectedChannel} onSelect={handleSelectChannel} onBack={() => {}} conversations={conversations} selectedConv={selectedConv} onSelectConv={handleSelectConv} onNewDM={handleNewDM} user={user} />
      {dmMode ? <DMView conversation={selectedConv} user={user} onBack={() => {}} /> : <MessageView channel={selectedChannel} user={user} onBack={() => {}} />}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 20 }}>
        <button onClick={logout} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#f04747', color: '#fff', cursor: 'pointer' }}>Logout</button>
      </div>
    </div>
  );
}