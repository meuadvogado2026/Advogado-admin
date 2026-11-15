import { FormEvent, useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function readProof() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.get("type") === "recovery" && /^[a-f0-9]{32,128}$/.test(params.get("token_hash") ?? "") ? params.get("token_hash")! : "";
}
export function PasswordAccessPage() {
  const [proof, setProof] = useState(readProof);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("Abra o link mais recente recebido por e-mail ou solicite outro abaixo.");
  useEffect(() => {
    window.history.replaceState(null, "", "/redefinir-senha");
    document.querySelector('meta[name="referrer"]')?.setAttribute("content", "no-referrer");
    const openLink = () => {
      setProof(readProof()); setDone(false); setPassword(""); setConfirmation("");
      window.history.replaceState(null, "", "/redefinir-senha");
    };
    window.addEventListener("hashchange", openLink);
    return () => window.removeEventListener("hashchange", openLink);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (proof && password !== confirmation) { setMessage("As senhas não conferem."); return; }
    setBusy(true);
    setMessage(proof ? "Salvando senha com segurança…" : "Solicitando link…");
    try {
      const response = await fetch(`${API_BASE_URL}/v1/auth/${proof ? "password-reset" : "password-recovery"}`, {
        method: "POST", signal: AbortSignal.timeout(30_000), headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proof ? { tokenHash: proof, type: "recovery", newPassword: password, confirmPassword: confirmation } : { email })
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 401 || (proof && response.status === 422)) setProof("");
        throw new Error(body.error?.message ?? "Não foi possível concluir. Tente novamente.");
      }
      if (proof) {
        setProof(""); setPassword(""); setConfirmation(""); setDone(true);
        setMessage("Senha definida. Entre no aplicativo com seu e-mail e a nova senha. Administradores podem voltar ao login do painel.");
      } else setMessage(body.message);
    } catch (error) {
      setMessage(error instanceof Error && error.name !== "TimeoutError" && error.name !== "TypeError" ? error.message : "Falha de conexão. Tente novamente; se o link já foi usado, solicite outro.");
    } finally { setBusy(false); }
  }
  return <main className="login-shell"><section className="login-view" aria-label="Recuperação de acesso">
    <form className="panel login-panel" onSubmit={submit}>
      <h1>{proof ? "Definir nova senha" : "Recuperar acesso"}</h1>
      <p>Advogado 2.0</p>
      {!done && (proof ? <>
        <label className="field"><span>Nova senha (8 a 72 caracteres)</span><input required minLength={8} maxLength={72} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} autoFocus /></label>
        <label className="field"><span>Confirmar nova senha</span><input required minLength={8} maxLength={72} type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></label>
      </> : <label className="field"><span>E-mail da conta</span><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} autoFocus /></label>)}
      {!done && <button disabled={busy} type="submit">{busy ? "Aguarde…" : proof ? "Definir senha" : "Enviar link seguro"}</button>}
      <p role="status" aria-live="polite">{message}</p>
      {proof && <><a href={`advogado20://auth/password-reset#token_hash=${proof}&type=recovery`} referrerPolicy="no-referrer">Abrir no aplicativo Android</a><p>Se o app não estiver instalado, conclua neste navegador.</p><button type="button" disabled={busy} onClick={() => setProof("")}>Solicitar outro link</button></>}
      <a href="/login">Voltar ao login administrativo</a>
    </form>
  </section></main>;
}
