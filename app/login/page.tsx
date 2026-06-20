"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigError } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage(supabaseConfigError);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleRegister() {
    setMessage("");

    if (!supabase) {
      setMessage(supabaseConfigError);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    setMessage(error ? error.message : "注册成功，请按 Supabase 邮箱设置完成确认后登录。");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="logo">店</div>
          <div>
            <h1>小店管家</h1>
            <p>登录后进入收银管理台</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label>
            邮箱
            <input
              className="field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            密码
            <input
              className="field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              required
            />
          </label>
          {message ? <div className="login-message">{message}</div> : null}
          <button className="primary-btn login-submit" disabled={loading} type="submit">
            {loading ? "处理中..." : "登录"}
          </button>
          <button className="small-btn" disabled={loading} type="button" onClick={handleRegister}>
            注册
          </button>
        </form>
      </section>
    </main>
  );
}
