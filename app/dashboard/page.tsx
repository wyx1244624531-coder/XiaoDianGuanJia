"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "config-error">("checking");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let active = true;

    getCurrentUser().then(({ user, error }) => {
      if (!active) return;

      if (error) {
        setMessage(error);
        setStatus("config-error");
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setStatus("ready");
    });

    return () => {
      active = false;
    };
  }, [router]);

  if (status === "checking") {
    return <main className="auth-state">正在检查登录状态...</main>;
  }

  if (status === "config-error") {
    return (
      <main className="auth-state">
        <strong>Supabase 配置未完成</strong>
        <p>{message}</p>
      </main>
    );
  }

  if (!userId) {
    return <main className="auth-state">当前未获取到用户身份，请返回入口页重新进入。</main>;
  }

  return <DashboardClient userId={userId} />;
}
