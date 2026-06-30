import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';

const Ctx = createContext(null);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = carregando
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="center muted">Carregando…</div>;
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}

export function Login() {
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'criar'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErro(''); setMsg(''); setLoading(true);
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        setMsg('Conta criada. Se a confirmação por email estiver ligada, confirme antes de entrar.');
      }
    } catch (e) { setErro(e.message || 'Falha na autenticação'); }
    finally { setLoading(false); }
  }

  return (
    <div className="center">
      <div className="card" style={{ width: 380, maxWidth: '90vw' }}>
        <div className="brand" style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, color: 'var(--navy)' }}>Dimensiona<span className="dot">.</span></h1>
        </div>
        <p className="sub">Facilities · Belfort — {modo === 'entrar' ? 'acesse sua conta' : 'crie sua conta'}</p>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        <label style={{ marginTop: 12 }}>Senha</label>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        {erro && <p className="hint" style={{ color: 'var(--bad)' }}>{erro}</p>}
        {msg && <p className="hint" style={{ color: 'var(--ok)' }}>{msg}</p>}
        <button className="btn" style={{ width: '100%', marginTop: 16 }} disabled={loading} onClick={submit}>
          {loading ? '…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <p className="hint" style={{ textAlign: 'center', marginTop: 14, cursor: 'pointer' }}
           onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setErro(''); }}>
          {modo === 'entrar' ? 'Não tem conta? Criar' : 'Já tem conta? Entrar'}
        </p>
      </div>
    </div>
  );
}
